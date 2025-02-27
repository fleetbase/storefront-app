import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { getServiceQuote } from '../utils/checkout';
import { numbersOnly } from '../utils/format';
import { percentage, calculateTip } from '../utils/math';
import { getCoordinates } from '../utils/location';
import { get, storefrontConfig } from '../utils';
import { toast } from '../utils/toast';
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
    const { currentStoreLocation } = useStoreLocations();
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
    const [isLoading, setIsLoading] = useState(true);
    const [isCapturingOrder, setIsCapturingOrder] = useState(false);
    const [error, setError] = useState(false);
    const [orderNotes, setOrderNotes] = useStorage(`${customer?.id ?? 'anon'}_order_notes`, '');
    const listenerRef = useRef();
    const hasOrderCompleted = useRef(false);
    const cartContentsString = JSON.stringify(cart.contents() || []);
    const subtotal = cart.subtotal();
    const totalAmount = useMemo(() => {
        const lineItems = computeLineItems();
        const totalItem = lineItems.find((item) => item.name === 'Total');
        return totalItem ? totalItem.value : 0;
    }, [checkoutOptions, subtotal, serviceQuote]);
    const isReady = serviceQuote && !isLoading;
    const isNotReady = !isReady;
    const isPickupEnabled = get(info, 'options.pickup_enabled') === true;

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

    const lineItems = useMemo(() => computeLineItems(), [checkoutOptions, subtotal, serviceQuote]);

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

    // Handle successful payment capture
    const handlePayment = useCallback(
        async (payment) => {
            if (hasOrderCompleted.current === true || !checkoutToken || !storefront || !cart) return;

            setIsCapturingOrder(true);
            setIsLoading(true);
            const status = payment.payment_status;

            if (status === 'PAID') {
                try {
                    // Set the flag immediately to prevent duplicate orders
                    hasOrderCompleted.current = true;

                    // Create the order
                    const order = await storefront.checkout.captureOrder(checkoutToken, { notes: orderNotes });
                    const emptiedCart = await cart.empty();
                    updateCart(emptiedCart);

                    // Ensure callback fires only once using a ref
                    if (typeof onOrderComplete === 'function') {
                        onOrderComplete(order);
                    }
                } catch (error) {
                    console.error('Error capturing order:', error);
                    toast.error(error.message);
                    // Optionally, allow a retry by resetting the flag on error:
                    // hasOrderCompleted.current = false;
                } finally {
                    setIsLoading(false);
                }
            } else {
                console.error('Payment status unknown:', status);
                setError(`Payment status unknown: ${status}`);
                setIsLoading(false);
                setIsCapturingOrder(false);
            }
        },
        [storefront, cart, checkoutToken, orderNotes, onOrderComplete, updateCart]
    );

    // Handle payment errors (avoid showing errors for not found payment)
    const handlePaymentError = useCallback(({ error, message }) => {
        if (error === 'PAYMENT_NOTFOUND') return;
        if (message) {
            toast.error(message);
        }
    }, []);

    // Extracted payment check function
    const checkPaymentStatus = useCallback(async () => {
        if (!checkoutId || !checkoutToken || !adapter) return;
        try {
            const { payment, error } = await adapter.get('checkouts/capture-qpay', {
                checkout: checkoutId,
                respond: 1,
            });
            console.log('[checkPayment #error]', error);
            console.log('[checkPayment #payment]', payment);
            if (error) {
                handlePaymentError(error);
            }
            if (payment) {
                handlePayment(payment);
            }
        } catch (err) {
            console.error('Error checking payment:', err);
        }
    }, [checkoutId, checkoutToken, adapter, handlePaymentError, handlePayment]);

    // Setup gateway on mount or when dependencies change
    useEffect(() => {
        setupGateway();
    }, [setupGateway, customer, cart, serviceQuote]);

    // Fetch service quote when cart or delivery location changes
    useEffect(() => {
        if (!cart) return;
        let isMounted = true;
        const destination = deliveryLocation.isSaved ? deliveryLocation : getCoordinates(deliveryLocation);
        const fetchServiceQuote = async () => {
            setServiceQuote(null);
            try {
                const quote = await getServiceQuote(currentStoreLocation, destination, cart);
                if (isMounted) {
                    setServiceQuote(quote);
                }
            } catch (error) {
                toast.error('Unable to calculate delivery fee.');
                console.error('Error fetching service quote:', error);
            }
        };

        fetchServiceQuote();

        return () => {
            isMounted = false;
        };
    }, [cartContentsString, cart, deliveryLocation?.id, currentStoreLocation?.id]);

    // Listen to payment updates via socket (if not already listening)
    useEffect(() => {
        if (!checkoutId || !checkoutToken || listenerRef.current) return;

        const listenForPaymentStatus = async () => {
            console.log(`[Listener created for socket channel: checkout.${checkoutId}]`);
            const listener = await listen(`checkout.${checkoutId}`, (event) => {
                console.log(`[checkout channel ${checkoutId} event]`, event);
                const { payment, error } = event;
                if (error) {
                    handlePaymentError(error);
                }
                if (payment) {
                    handlePayment(payment);
                }
            });
            if (listener) {
                listenerRef.current = listener;
            }
        };

        listenForPaymentStatus();

        return () => {
            if (listenerRef.current) {
                console.log('[Checkout socket channel was stopped!]');
                listenerRef.current.stop();
                listenerRef.current = null;
            }
        };
    }, [listen, checkoutId, checkoutToken, handlePayment, handlePaymentError]);

    // Run payment check when the screen gains focus
    useFocusEffect(
        useCallback(() => {
            checkPaymentStatus();
        }, [checkPaymentStatus])
    );

    // Also run payment check when the app returns from the background.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                // When the app becomes active again, re-check payment status.
                checkPaymentStatus();
            }
        });
        return () => {
            subscription.remove();
        };
    }, [checkPaymentStatus]);

    // Memoize the return value to provide stable references if needed
    const api = useMemo(
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
            isReady: serviceQuote && !isLoading,
            isNotReady: !(serviceQuote && !isLoading),
            orderNotes,
            setOrderNotes,
            storeLocationId,
            originLocationId: foodTruckId ?? storeLocationId,
            listener: listenerRef.current,
            hasOrderCompleted: hasOrderCompleted.current,
            isCapturingOrder,
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
        ]
    );

    return api;
}
