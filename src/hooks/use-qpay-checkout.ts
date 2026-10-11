import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { getServiceQuote } from '../utils/checkout';
import { getCartOriginIds, getCartQuoteOrigin } from '../network/network-runtime';
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
    const isCheckingStatus = useRef(false);
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
    // Cart lines the server says can no longer be ordered (product or food truck gone), or null.
    const [unavailableItems, setUnavailableItems] = useState<Array<{ id?: string; name?: string }> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCapturingOrder, setIsCapturingOrder] = useState(false);
    // The payment, once the customer goes to pay:
    // idle → awaiting (paying in a bank app) → verifying (back, checking) → paid (QPay
    // confirmed; the order is being placed) → the order screen. Also: not_received (back,
    // no payment yet), failed (the payment didn't go through), slow (paid, order taking long).
    const [paymentStage, setPaymentStage] = useState('idle');
    const [paymentInfo, setPaymentInfo] = useState(null);
    const [paymentError, setPaymentError] = useState(null);
    const paymentStarted = useRef(false);
    const leftForPayment = useRef(false);
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

    const lineItems = useMemo(() => computeLineItems(), [checkoutOptions, subtotal, serviceQuote, isServiceQuoteUnavailable, unavailableItems]);

    // Memoize store location and food truck IDs based on cart contents
    const storeLocationIds = useMemo(() => getCartOriginIds(cart), [cartContentsString]);
    const storeLocationId = storeLocationIds[0] || null;
    const quoteOrigin = useMemo(() => getCartQuoteOrigin(cart), [cartContentsString]);

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

            // Convert order response to SDK Order instance
            // This ensures onOrderComplete callback always receives proper SDK instance
            const orderInstance = order instanceof Order ? order : new Order(order);

            // Set the flag immediately to prevent duplicate processing
            hasOrderCompleted.current = true;
            setIsCapturingOrder(true);

            try {
                // Push order into local history cache immediately
                if (customer?.id) {
                    addOrderToHistoryCache(customer.id, orderInstance);
                }

                // Show the order straight away (fires once, guarded by the ref above)
                if (typeof onOrderComplete === 'function') {
                    onOrderComplete(orderInstance);
                }

                // The cart was checked out with the order: pick up the device's open cart in
                // the background rather than making the customer wait for it.
                cart.empty()
                    .then(updateCart)
                    .catch((cartError) => console.warn('Unable to refresh the cart after the order:', cartError));
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
        if (error === 'PAYMENT_NOTFOUND' || error === 'PAYMENT_NOT_PAID') return;
        setPaymentError(message ?? null);
        setPaymentStage('failed');
    }, []);

    // QPay confirmed the payment (live update or status check): show it at once.
    const markPaid = useCallback((payment) => {
        if (payment) setPaymentInfo(payment);
        setPaymentStage((stage) => (stage === 'slow' ? stage : 'paid'));
    }, []);

    // Check the checkout's status. The server answers from the checkout (fast, no QPay call);
    // `verify` additionally asks QPay, used once when the customer comes back from paying.
    const checkOrderStatus = useCallback(
        async ({ verify = false } = {}) => {
            if (!checkoutId || !checkoutToken || !adapter || hasOrderCompleted.current) return;

            // One quick check at a time; a verify always goes ahead.
            if (!verify && isCheckingStatus.current) return;
            if (!verify) isCheckingStatus.current = true;

            try {
                const response = await adapter.get('checkouts/status', {
                    checkout: checkoutId,
                    token: checkoutToken,
                    verify: verify ? 1 : 0,
                });

                const { order, error, status, payment } = response;

                if (order) {
                    handleOrderCompletion(order);
                    return;
                }
                if (error) {
                    handlePaymentError(error);
                }
                if (status === 'paid') {
                    markPaid(payment);
                }
            } catch (err) {
                // iOS cuts requests off while the app is in the background (e.g. in a bank app),
                // which surfaces as a network error: expected, so it isn't logged as an error, and
                // the status is checked again shortly once the app is back in the foreground.
                if (err?.code === 'NETWORK_ERROR') {
                    console.warn('Order status check interrupted; retrying');
                    setTimeout(() => {
                        if (AppState.currentState === 'active' && !hasOrderCompleted.current) checkOrderStatusRef.current?.({ verify });
                    }, 1000);
                } else {
                    console.error('Error checking order status:', err);
                }
            } finally {
                if (!verify) isCheckingStatus.current = false;
            }
        },
        [checkoutId, checkoutToken, adapter, handlePaymentError, handleOrderCompletion, markPaid]
    );

    // The customer chose to pay (opened the bank list): leaving the app now means paying.
    const startPayment = useCallback(() => {
        paymentStarted.current = true;
        setPaymentError(null);
        setPaymentStage((stage) => (stage === 'verifying' || stage === 'not_received' || stage === 'failed' ? 'idle' : stage));
    }, []);

    // "Check again": ask QPay once more.
    const verifyPayment = useCallback(() => {
        setPaymentStage('verifying');
        checkOrderStatus({ verify: true });
    }, [checkOrderStatus]);

    // Back to the checkout from a not-received or failed payment.
    const dismissPaymentStatus = useCallback(() => {
        paymentStarted.current = false;
        setPaymentError(null);
        setPaymentStage('idle');
    }, []);

    const checkOrderStatusRef = useRef(null);
    useEffect(() => {
        checkOrderStatusRef.current = checkOrderStatus;
    }, [checkOrderStatus]);

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
        // No address yet: nothing to quote until one is chosen.
        if (!cart || !deliveryLocation) return;

        let isMounted = true;
        const origin = quoteOrigin ?? foodTruckId ?? storeLocationId;
        const destination = deliveryLocation.isSaved ? deliveryLocation : getCoordinates(deliveryLocation);
        const fetchServiceQuote = async () => {
            setServiceQuote(null);
            // A new address or cart gets a fresh try; an earlier failure shouldn't stick.
            setIsServiceQuoteUnavailable(false);
            setUnavailableItems(null);
            try {
                const quote = await getServiceQuote(origin, destination, cart);
                if (isMounted) {
                    setServiceQuote(quote);
                }
            } catch (error) {
                if (isMounted) {
                    setIsServiceQuoteUnavailable(true);
                    setUnavailableItems((error as any)?.code === 'cart_items_unavailable' ? ((error as any)?.response?.items ?? []) : null);
                }
                console.warn('Error fetching service quote:', error);
            }
        };

        fetchServiceQuote();

        return () => {
            isMounted = false;
        };
    }, [cartContentsString, cart, deliveryLocation?.id, foodTruckId, quoteOrigin, storeLocationId]);

    // Listen to order updates via socket (if not already listening)
    useEffect(() => {
        if (!checkoutId || !checkoutToken || listenerRef.current) return;

        const listenForOrderStatus = async () => {
            console.log(`[Listener created for socket channel: checkout.${checkoutId}]`);
            const listener = await listen(`checkout.${checkoutId}`, (event) => {
                console.log(`[checkout channel ${checkoutId} event]`, event);
                const { order, error, status, payment } = event;
                if (order) {
                    handleOrderCompletion(order);
                    return;
                }
                if (error) {
                    handlePaymentError(error);
                }
                // The server says so the moment QPay confirms the payment, then again with the order.
                if (status === 'paid') {
                    markPaid(payment);
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
    }, [listen, checkoutId, checkoutToken, handleOrderCompletion, handlePaymentError, markPaid]);

    // Run order status check when the screen gains focus
    useFocusEffect(
        useCallback(() => {
            checkOrderStatus();
        }, [checkOrderStatus])
    );

    // Leaving the app after choosing to pay means paying in a bank app; coming back, check
    // at once (verify) and show that the payment is being checked.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'background' && paymentStarted.current && checkoutId && !hasOrderCompleted.current) {
                leftForPayment.current = true;
                setPaymentStage((stage) => (stage === 'idle' || stage === 'not_received' ? 'awaiting' : stage));
            }
            if (nextAppState === 'active') {
                if (leftForPayment.current && !hasOrderCompleted.current) {
                    leftForPayment.current = false;
                    setPaymentStage((stage) => (stage === 'awaiting' ? 'verifying' : stage));
                    checkOrderStatus({ verify: true });
                } else {
                    checkOrderStatus();
                }
            }
        });
        return () => {
            subscription.remove();
        };
    }, [checkOrderStatus, checkoutId]);

    // While a payment is under way and the app is in front, ask the server often: it answers
    // from the checkout without calling QPay, so a lost live update costs at most a second.
    useEffect(() => {
        if (!checkoutId || !['awaiting', 'verifying', 'paid', 'slow', 'not_received'].includes(paymentStage)) return;
        const every = paymentStage === 'verifying' || paymentStage === 'paid' ? 1000 : 2500;
        const timer = setInterval(() => {
            if (AppState.currentState === 'active' && !hasOrderCompleted.current) checkOrderStatus();
        }, every);
        return () => clearInterval(timer);
    }, [paymentStage, checkoutId, checkOrderStatus]);

    // Verifying with no payment after a few seconds: not received (the customer can check
    // again or go back to the bank app). Paid with no order after a while: say so.
    useEffect(() => {
        if (paymentStage !== 'verifying' && paymentStage !== 'paid') return;
        const timer = setTimeout(
            () => {
                if (hasOrderCompleted.current) return;
                setPaymentStage((stage) => (stage === 'verifying' ? 'not_received' : stage === 'paid' ? 'slow' : stage));
            },
            paymentStage === 'verifying' ? 6000 : 25000
        );
        return () => clearTimeout(timer);
    }, [paymentStage]);

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
            originLocationId: quoteOrigin ?? foodTruckId ?? storeLocationId,
            storeLocationIds,
            listener: listenerRef.current,
            hasOrderCompleted: hasOrderCompleted.current,
            isCapturingOrder,
            paymentStage,
            paymentInfo,
            paymentError,
            startPayment,
            verifyPayment,
            dismissPaymentStatus,
            isServiceQuoteUnavailable,
            unavailableItems,
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
            storeLocationIds,
            quoteOrigin,
            hasOrderCompleted.current,
            isCapturingOrder,
            paymentStage,
            paymentInfo,
            paymentError,
            startPayment,
            verifyPayment,
            dismissPaymentStatus,
            isServiceQuoteUnavailable,
            unavailableItems,
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
