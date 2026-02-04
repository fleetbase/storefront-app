import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { getServiceQuote } from '../utils/checkout';
import { numbersOnly } from '../utils/format';
import { percentage, calculateTip } from '../utils/math';
import { getCoordinates } from '../utils/location';
import { get, storefrontConfig, debounce, isBlank } from '../utils';
import { toast } from '../utils/toast';
import { addOrderToHistoryCache, markOrderHistoryDirty } from '../utils/order-history-cache';
import { Order } from '@fleetbase/sdk';
import useStorefront from '../hooks/use-storefront';
import useCurrentLocation from '../hooks/use-current-location';
import useStoreLocations from '../hooks/use-store-locations';
import useStorefrontInfo from '../hooks/use-storefront-info';
import useSocketClusterClient from '../hooks/use-socket-cluster-client';
import useCart from '../hooks/use-cart';
import useStorage from '../hooks/use-storage';
import { useLanguage } from '../contexts/LanguageContext';

export default function useQPayCheckout({ onOrderComplete }) {
    const { storefront, adapter } = useStorefront();
    const { info } = useStorefrontInfo();
    const { t } = useLanguage();
    const { customer, updateCustomerMeta } = useAuth();
    const { currentLocation: deliveryLocation, updateDefaultLocation } = useCurrentLocation();
    const { listen } = useSocketClusterClient();
    const [cart, updateCart] = useCart();
    const [checkoutOptions, setCheckoutOptions] = useState({
        leavingTip: false,
        tip: 0,
        leavingDeliveryTip: false,
        deliveryTip: 0,
        pickup: storefrontConfig('prioritizePickup') ? 1 : 0,
    });
    const [invoice, setInvoice] = useState();
    const [checkoutId, setCheckoutId] = useState();
    const [checkoutToken, setCheckoutToken] = useState();
    const [serviceQuote, setServiceQuote] = useState(null);
    const [isServiceQuoteUnavailable, setIsServiceQuoteUnavailable] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isCapturingOrder, setIsCapturingOrder] = useState(false);
    const [error, setError] = useState(false);
    // Order notes
    const [orderNotes, setOrderNotes] = useStorage(`${customer?.id ?? 'anon'}_order_notes`, '');
    // Ebarimt company registration no
    const companyRegistrationNumber = useMemo(() => {
        if (customer && typeof customer.getAttribute === 'function') {
            return customer.getAttribute('meta.ebarimt_registration_no', '');
        }
        return '';
    }, [customer]);
    const [isPersonal, setIsPersonal] = useState(isBlank(companyRegistrationNumber));
    const listenerRef = useRef();
    const hasOrderCompleted = useRef(false);
    const cartContentsString = JSON.stringify(cart.contents() || []);
    const subtotal = cart.subtotal();
    const totalAmount = useMemo(() => {
        const lineItems = computeLineItems();
        const totalItem = lineItems.find((item) => item.name === 'Total');
        return totalItem ? totalItem.value : 0;
    }, [checkoutOptions, subtotal, serviceQuote]);
    const isPickupEnabled = get(info, 'options.pickup_enabled') === true;
    
    // Minimum checkout validation
    const isMinimumCheckoutEnabled = get(info, 'options.required_checkout_min') === true;
    const minimumCheckoutAmount = get(info, 'options.required_checkout_min_amount', 0);
    const isBelowMinimum = isMinimumCheckoutEnabled && subtotal < minimumCheckoutAmount;
    
    const isReady = serviceQuote && !isLoading && !isBelowMinimum;
    const isNotReady = !isReady;

    // Calculate line items
    function computeLineItems() {
        const baseItems = [
            {
                name: t('lineItems.cartSubtotal'),
                value: subtotal,
            },
        ];

        if (checkoutOptions.leavingTip) {
            baseItems.push({
                name: t('lineItems.tip'),
                value: calculateTip(checkoutOptions.tip, subtotal),
                tip: checkoutOptions.tip,
            });
        }

        if (checkoutOptions.leavingDeliveryTip) {
            baseItems.push({
                name: t('lineItems.deliveryTip'),
                value: calculateTip(checkoutOptions.deliveryTip, subtotal),
                tip: checkoutOptions.deliveryTip,
            });
        }

        if (!checkoutOptions.pickup) {
            if (serviceQuote) {
                baseItems.push({
                    name: t('lineItems.serviceFee'),
                    value: serviceQuote.getAttribute('amount'),
                });
            } else if (isServiceQuoteUnavailable) {
                baseItems.push({
                    name: t('lineItems.serviceFee'),
                    value: 0,
                });
            } else if (deliveryLocation?.id) {
                baseItems.push({
                    name: t('lineItems.serviceFee'),
                    value: 0,
                    loading: true,
                });
            }
        }

        const total = baseItems.reduce((acc, item) => acc + numbersOnly(item.value), 0);
        baseItems.push({
            name: t('lineItems.total'),
            value: total,
        });

        return baseItems;
    }

    const lineItems = useMemo(() => computeLineItems(), [checkoutOptions, subtotal, serviceQuote, isServiceQuoteUnavailable]);

    // Memoize store location and food truck IDs based on cart contents
    const storeLocationId = useMemo(() => {
        if (!cart?.contents || typeof cart.contents !== 'function') return null;
        const storeLocationIds = cart.contents().map((item) => item.store_location_id);
        return [...new Set(storeLocationIds)][0] || null;
    }, [cartContentsString]);

    const foodTruckId = useMemo(() => {
        if (!cart?.contents || typeof cart.contents !== 'function') return null;
        const foodTruckIds = cart.contents().map((item) => item.food_truck_id);
        return [...new Set(foodTruckIds)][0] || null;
    }, [cartContentsString]);

    // Callbacks for updating options
    const setTipOptions = useCallback((newOptions) => {
        setCheckoutOptions((prev) => ({ ...prev, ...newOptions }));
    }, []);

    const setPickup = useCallback((pickup) => {
        setCheckoutOptions((prev) => ({ ...prev, pickup }));
    }, []);

    const debouncedUpdateRegistration = useMemo(
        () =>
            debounce((registrationNumber) => {
                updateCustomerMeta({ ebarimt_registration_no: registrationNumber });
            }, 500), // 500ms delay
        []
    );

    const setCompanyRegistrationNumber = useCallback(
        (registrationNumber) => {
            debouncedUpdateRegistration(registrationNumber);
        },
        [debouncedUpdateRegistration]
    );

    const handleDeliveryLocationChange = useCallback(
        (newLocation) => {
            updateDefaultLocation(newLocation);
        },
        [updateDefaultLocation]
    );

    // Initialize the payment gateway and get checkout details
    const setupGateway = useCallback(async () => {
        if (!storefront || !customer || !cart || !serviceQuote) return;

        setIsLoading(true);
        try {
            const { token, checkout, invoice } = await storefront.checkout.initialize(customer, cart, serviceQuote, 'qpay', checkoutOptions);
            setInvoice(invoice);
            setCheckoutId(checkout);
            setCheckoutToken(token);
        } catch (err) {
            console.error('Unable to initialize payment gateway:', err);
        } finally {
            setIsLoading(false);
        }
    }, [storefront, customer, cart, serviceQuote, checkoutOptions]);

    // Handle order completion (order already created by backend)
    const handleOrderCompletion = useCallback(
        async (order) => {
            if (hasOrderCompleted.current === true || !order) return;

            // Set the flag immediately to prevent duplicate processing
            hasOrderCompleted.current = true;
            setIsCapturingOrder(true);

            try {
                const emptiedCart = await cart.empty();
                updateCart(emptiedCart);

                // Push order into local history cache immediately
                if (customer?.id) {
                    addOrderToHistoryCache(customer.id, order);
                }

                // Ensure callback fires only once using a ref
                if (typeof onOrderComplete === 'function') {
                    onOrderComplete(order);
                }
            } catch (error) {
                console.error('Error processing order completion:', error);
                toast.error(error.message);
            } finally {
                setIsLoading(false);
                setIsCapturingOrder(false);
            }
        },
        [cart, customer, onOrderComplete, updateCart]
    );

    // Handle payment errors (avoid showing errors for not found payment)
    const handlePaymentError = useCallback(({ error, message }) => {
        if (error === 'PAYMENT_NOTFOUND') return;
        if (message) {
            toast.error(message);
        }
    }, []);

    // Check order status using new endpoint
    const checkOrderStatus = useCallback(async () => {
        if (!checkoutId || !checkoutToken || !adapter) return;
        try {
            const response = await adapter.get('checkouts/status', {
                checkout: checkoutId,
                token: checkoutToken,
            });
            console.log('[checkOrderStatus #response]', response);
            
            const { order, error } = response;
            
            if (error) {
                handlePaymentError(error);
            }
            
            if (order) {
                // Convert order response to SDK Order instance
                const orderInstance = order instanceof Order ? order : new Order(order);
                handleOrderCompletion(orderInstance);
            }
        } catch (err) {
            console.error('Error checking order status:', err);
        }
    }, [checkoutId, checkoutToken, adapter, handlePaymentError, handleOrderCompletion]);

    // Setup gateway on mount or when dependencies change
    useEffect(() => {
        setupGateway();
    }, [setupGateway, customer, cart, serviceQuote]);

    // Check for existing order on mount (order recovery)
    useEffect(() => {
        checkOrderStatus();
    }, []);

    // Fetch service quote when cart or delivery location changes
    useEffect(() => {
        if (!cart) return;

        let isMounted = true;
        const origin = foodTruckId ?? storeLocationId;
        const destination = deliveryLocation.isSaved ? deliveryLocation : getCoordinates(deliveryLocation);
        const fetchServiceQuote = async () => {
            setServiceQuote(null);
            try {
                const quote = await getServiceQuote(origin, destination, cart);
                if (isMounted) {
                    setServiceQuote(quote);
                }
            } catch (error) {
                setIsServiceQuoteUnavailable(true);
                console.warn('Error fetching service quote:', error);
            }
        };

        fetchServiceQuote();

        return () => {
            isMounted = false;
        };
    }, [cartContentsString, cart, deliveryLocation?.id, foodTruckId, storeLocationId]);

    // Listen to order updates via socket (if not already listening)
    useEffect(() => {
        if (!checkoutId || !checkoutToken || listenerRef.current) return;

        const listenForOrderStatus = async () => {
            console.log(`[Listener created for socket channel: checkout.${checkoutId}]`);
            const listener = await listen(`checkout.${checkoutId}`, (event) => {
                console.log(`[checkout channel ${checkoutId} event]`, event);
                const { order, error } = event;
                if (error) {
                    handlePaymentError(error);
                }
                if (order) {
                    handleOrderCompletion(order);
                }
            });
            if (listener) {
                listenerRef.current = listener;
            }
        };

        listenForOrderStatus();

        return () => {
            if (listenerRef.current) {
                console.log('[Checkout socket channel was stopped!]');
                listenerRef.current.stop();
                listenerRef.current = null;
            }
        };
    }, [listen, checkoutId, checkoutToken, handleOrderCompletion, handlePaymentError]);

    // Run order status check when the screen gains focus
    useFocusEffect(
        useCallback(() => {
            checkOrderStatus();
        }, [checkOrderStatus])
    );

    // Also run order status check when the app returns from the background.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                // When the app becomes active again, re-check order status.
                checkOrderStatus();
            }
        });
        return () => {
            subscription.remove();
        };
    }, [checkOrderStatus]);

    // Memoize the return value to provide stable references
    const checkout = useMemo(
        () => ({
            cart,
            storefront,
            customer,
            totalAmount: lineItems.find((item) => item.name === t('lineItems.total'))?.value || 0,
            lineItems,
            checkoutOptions,
            serviceQuote,
            deliveryLocation,
            foodTruckId,
            isLoading,
            invoice,
            checkoutId,
            checkoutToken,
            handleDeliveryLocationChange,
            setTipOptions,
            isPickupEnabled: get(info, 'options.pickup_enabled') === true,
            setPickup,
            isPickup: !!checkoutOptions.pickup,
            error,
            isReady: serviceQuote && !isLoading && !isBelowMinimum,
            isNotReady: !(serviceQuote && !isLoading && !isBelowMinimum),
            isBelowMinimum,
            minimumCheckoutAmount,
            isMinimumCheckoutEnabled,
            subtotal,
            orderNotes,
            setOrderNotes,
            storeLocationId,
            originLocationId: foodTruckId ?? storeLocationId,
            listener: listenerRef.current,
            hasOrderCompleted: hasOrderCompleted.current,
            isCapturingOrder,
            isServiceQuoteUnavailable,
            isBelowMinimum,
            minimumCheckoutAmount,
            isMinimumCheckoutEnabled,
            subtotal,
            isPersonal,
            setIsPersonal,
            isCompany: !isPersonal,
            companyRegistrationNumber,
            setCompanyRegistrationNumber,
        }),
        [
            cart,
            storefront,
            customer,
            lineItems,
            checkoutOptions,
            serviceQuote,
            deliveryLocation,
            foodTruckId,
            isLoading,
            invoice,
            checkoutId,
            checkoutToken,
            info,
            error,
            orderNotes,
            storeLocationId,
            hasOrderCompleted.current,
            isCapturingOrder,
            isServiceQuoteUnavailable,
            isBelowMinimum,
            minimumCheckoutAmount,
            isMinimumCheckoutEnabled,
            subtotal,
            isPersonal,
            setIsPersonal,
            companyRegistrationNumber,
            setCompanyRegistrationNumber,
        ]
    );

    return checkout;
}
