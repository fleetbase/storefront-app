import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { PaymentIntent, Stripe, StripeElements, StripePaymentElementChangeEvent } from '@stripe/stripe-js';
import { useAuth } from '../contexts/AuthContext';
import { getServiceQuote } from '../utils/checkout';
import { getCartOriginIds, getCartQuoteOrigin } from '../network/network-runtime';
import { numbersOnly } from '../utils/format';
import { calculateTip } from '../utils/math';
import { getCoordinates } from '../utils/location';
import { storefrontConfig, get } from '../utils';
import { toast } from '../utils/toast';
import { addOrderToHistoryCache } from '../utils/order-history-cache';
import { captureErrorMessage, captureWithRetry, pendingCaptureFor, unavailableItemsFromError, type PendingCapture, type UnavailableItem } from '../commerce/checkout-capture';
import useStorefront from '../hooks/use-storefront';
import useCart from '../hooks/use-cart';
import useCurrentLocation from '../hooks/use-current-location';
import useStoreLocations from '../hooks/use-store-locations';
import useStorefrontInfo from '../hooks/use-storefront-info';
import useStorage from '../hooks/use-storage';
import { useLanguage } from '../contexts/LanguageContext';
import { getStripe, stripeReturnUrl } from '../utils/stripe-web';

/**
 * The payment of a web checkout: Stripe's PaymentIntent and the Fleetbase checkout made with it,
 * kept until the order is created so a declined card is retried on the same intent and a
 * bank's check (3-D Secure) that leaves the page can finish when the customer comes back.
 */
type WebIntent = { paymentIntent: string; clientSecret: string; token: string; customerId: string | null };

/**
 * Stripe checkout on the web, with the Payment Element (StripePaymentElement.web.tsx). The
 * card form is shown without a PaymentIntent; the intent is made when the customer places the
 * order (checkout initialize), then confirmed in the browser, and the order is captured.
 * Shares everything else (line items, quotes, capture) with the native hook.
 */
export default function useStripeCheckout({ onOrderComplete }) {
    const { storefront } = useStorefront();
    const { info } = useStorefrontInfo();
    const { t } = useLanguage();
    const [cart, updateCart] = useCart();
    const { customer } = useAuth();
    const { currentLocation: deliveryLocation, updateDefaultLocation } = useCurrentLocation();
    const { currentStoreLocation } = useStoreLocations();
    const stripeRef = useRef<{ stripe: Stripe | null; elements: StripeElements | null }>({ stripe: null, elements: null });
    const [checkoutOptions, setCheckoutOptions] = useState({
        leavingTip: false,
        tip: 0,
        leavingDeliveryTip: false,
        deliveryTip: 0,
        pickup: storefrontConfig('prioritizePickup') ? 1 : 0,
    });
    const [serviceQuote, setServiceQuote] = useState(null);
    const [isServiceQuoteUnavailable, setIsServiceQuoteUnavailable] = useState(false);
    // Cart lines the server says can no longer be ordered (product or food truck gone), or null.
    const [unavailableItems, setUnavailableItems] = useState<UnavailableItem[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [stripeLoading, setStripeLoading] = useState(false);
    const [setupIntentLoading] = useState(false);
    const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
    const [storedIntent, setWebIntent] = useStorage<WebIntent | null>('_stripe_web_checkout_intent', null);
    const webIntent = storedIntent && storedIntent.customerId === (customer?.id ?? null) ? storedIntent : null;
    const [orderNotes, setOrderNotes] = useStorage(`${customer?.id ?? 'anon'}_order_notes`, '');
    const [error, setError] = useState(null);
    const cartContentsString = JSON.stringify(cart.contents() || []);

    // A changed cart gets a fresh check: items named unavailable before may be gone now.
    useEffect(() => {
        setUnavailableItems(null);
    }, [cartContentsString]);
    const subtotal = cart.subtotal();
    const totalAmount = useMemo(() => {
        const lineItems = computeLineItems();
        const totalItem = lineItems.find((item) => item.name === t('lineItems.total'));
        return totalItem ? totalItem.value : 0;
    }, [checkoutOptions, subtotal, serviceQuote]);
    const isPickupEnabled = get(info, 'options.pickup_enabled') === true;

    // Minimum checkout validation
    const isMinimumCheckoutEnabled = get(info, 'options.required_checkout_min') === true;
    const minimumCheckoutAmount = get(info, 'options.required_checkout_min_amount', 0);
    const isBelowMinimum = isMinimumCheckoutEnabled && subtotal < minimumCheckoutAmount;

    const isReady = Boolean(paymentMethod) && !isLoading && !stripeLoading && (checkoutOptions?.pickup || Boolean(serviceQuote)) && !isBelowMinimum;

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

    const storeLocationIds = useMemo(() => getCartOriginIds(cart), [cartContentsString]);
    const storeLocationId = storeLocationIds[0] || null;
    const quoteOrigin = useMemo(() => getCartQuoteOrigin(cart), [cartContentsString]);

    const foodTruckId = useMemo(() => {
        if (!cart?.contents || typeof cart.contents !== 'function') return null;

        const foodTruckIds = cart.contents().map((item) => item.food_truck_id);
        const uniqueFoodTruckIds = [...new Set(foodTruckIds)];

        return uniqueFoodTruckIds[0] || null;
    }, [cartContentsString]);

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

    const handlePaymentMethodChange = useCallback((method) => {
        setPaymentMethod(method);
    }, []);

    // The Payment Element, once it's on screen.
    const attachStripe = useCallback((stripe: Stripe | null, elements: StripeElements | null) => {
        stripeRef.current = { stripe, elements };
        setPaymentSheetEnabled(Boolean(stripe && elements));
    }, []);

    // A complete card (or other method) in the form is the payment method.
    const handlePaymentElementChange = useCallback((event: StripePaymentElementChangeEvent) => {
        setPaymentMethod(event.complete ? { type: event.value?.type ?? 'card' } : null);
    }, []);

    // The card form's amount and currency; Stripe shows the methods that fit them.
    const currency = String(cart?.getAttribute?.('currency') ?? info?.currency ?? 'USD').toLowerCase();
    const elementsOptions = useMemo(() => ({ mode: 'payment' as const, amount: Math.max(1, Math.round(numbersOnly(totalAmount) || 0)), currency }), [totalAmount, currency]);

    // A paid checkout whose order isn't created yet, kept across restarts so the customer
    // can finish placing it without paying again.
    const [storedPendingCapture, setPendingCapture] = useStorage<PendingCapture | null>('_pending_checkout_capture', null);
    const pendingCapture = pendingCaptureFor(storedPendingCapture, customer?.id);

    // The payment went through: create the order. Capture is retried, and if it still
    // fails the checkout stays pending instead of being lost.
    const completePaidOrder = useCallback(
        async (checkoutToken, callback, notes = orderNotes) => {
            const pending = { token: checkoutToken, notes, customerId: customer?.id ?? null, paidAt: new Date().toISOString() };
            setPendingCapture(pending);
            let order;
            try {
                order = await captureWithRetry(() => storefront.checkout.captureOrder(checkoutToken, { notes }));
            } catch (error) {
                // Kept on screen (not a passing toast): what happened, why, and that retrying never charges again.
                console.warn('Order capture failed after payment:', error);
                setPendingCapture({ ...pending, lastError: captureErrorMessage(error), lastTriedAt: new Date().toISOString() });
                return;
            }
            setPendingCapture(null);

            try {
                const emptiedCart = await cart.empty();
                updateCart(emptiedCart);
            } catch (error) {
                console.warn('Could not empty the cart after the order:', error);
            }

            // Push order into local history cache immediately
            if (customer?.id) {
                addOrderToHistoryCache(customer.id, order);
            }

            if (!onOrderComplete && typeof callback === 'function') {
                callback(order);
            }

            if (!callback && typeof onOrderComplete === 'function') {
                onOrderComplete(order);
            }
        },
        [cart, updateCart, storefront, customer, orderNotes, onOrderComplete, setPendingCapture, t]
    );

    // Finish a paid checkout whose order wasn't created; never charges again.
    const finishPendingOrder = useCallback(
        async (callback) => {
            if (!pendingCapture) return;
            setIsLoading(true);
            try {
                await completePaidOrder(pendingCapture.token, callback, pendingCapture.notes);
            } finally {
                setIsLoading(false);
            }
        },
        [pendingCapture, completePaidOrder]
    );

    // The order is created once Stripe says the payment succeeded; the intent is done with then.
    const finishConfirmedPayment = useCallback(
        async (paymentIntent: PaymentIntent | undefined, intent: WebIntent, callback) => {
            if (paymentIntent?.status === 'succeeded') {
                setWebIntent(null);
                await completePaidOrder(intent.token, callback);
                return;
            }
            if (paymentIntent?.status === 'processing') {
                toast.info(t('StripePaymentElement.processing'));
                return;
            }
            toast.error(t('StripePaymentElement.paymentFailed'));
        },
        [completePaidOrder, setWebIntent, t]
    );

    // The checkout's PaymentIntent: the one already made for this checkout (a declined card
    // tries again on it, at the current amount), or a new one. Null when it was paid already.
    const prepareIntent = useCallback(
        async (stripe: Stripe, callback): Promise<WebIntent | null> => {
            if (webIntent) {
                const { paymentIntent: existing } = await stripe.retrievePaymentIntent(webIntent.clientSecret);
                if (existing?.status === 'succeeded') {
                    await finishConfirmedPayment(existing, webIntent, callback);
                    return null;
                }
                if (existing && existing.status !== 'canceled') {
                    const { paymentIntent, clientSecret, token }: any = await storefront.checkout.updateStripePaymentIntent(webIntent.paymentIntent, customer, cart as any, serviceQuote, checkoutOptions);
                    const next = { ...webIntent, paymentIntent: paymentIntent ?? webIntent.paymentIntent, clientSecret: clientSecret ?? webIntent.clientSecret, token: token ?? webIntent.token };
                    setWebIntent(next);
                    return next;
                }
            }
            const { paymentIntent, clientSecret, token }: any = await storefront.checkout.initialize(customer, cart as any, serviceQuote, 'stripe', checkoutOptions);
            const next = { paymentIntent, clientSecret, token, customerId: customer?.id ?? null };
            setWebIntent(next);
            return next;
        },
        [webIntent, storefront, customer, cart, serviceQuote, checkoutOptions, finishConfirmedPayment, setWebIntent]
    );

    const handleCompleteOrderWithElement = useCallback(
        async (callback) => {
            const { stripe, elements } = stripeRef.current;
            if (!stripe || !elements) {
                toast.error(t('StripePaymentElement.notReady'));
                return;
            }

            setIsLoading(true);
            try {
                // Checks the form first; its errors show under the fields.
                const { error: formError } = await elements.submit();
                if (formError) return;

                const intent = await prepareIntent(stripe, callback);
                if (!intent) return;

                const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
                    elements,
                    clientSecret: intent.clientSecret,
                    confirmParams: { return_url: stripeReturnUrl() },
                    // Cards stay on the page; a bank's check or a redirect method leaves and comes back.
                    redirect: 'if_required',
                });

                if (paymentError) {
                    // The intent is kept: trying again (another card) uses it.
                    console.warn('Stripe payment failed:', paymentError);
                    toast.error(paymentError.message ?? t('StripePaymentElement.paymentFailed'));
                    return;
                }

                await finishConfirmedPayment(paymentIntent, intent, callback);
            } catch (error) {
                console.error('Error completing order:', error);
                // Stock ran out (or an item went) while checkout reserved it: name what to remove.
                const unavailable = unavailableItemsFromError(error);
                if (unavailable) setUnavailableItems(unavailable);
                toast.error(error.message);
            } finally {
                setIsLoading(false);
            }
        },
        [prepareIntent, finishConfirmedPayment, t]
    );

    /**
     * Back from Stripe (the address has `payment_intent` and `payment_intent_client_secret`):
     * create the order if the payment went through. Only for this checkout's own intent.
     */
    const handleRedirectReturn = useCallback(
        async ({ paymentIntent: paymentIntentId, clientSecret }: { paymentIntent: string; clientSecret: string }, callback) => {
            if (!webIntent || webIntent.paymentIntent !== paymentIntentId) return;
            const stripe = await getStripe();
            if (!stripe) return;
            setIsLoading(true);
            try {
                const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);
                if (error) {
                    toast.error(error.message ?? t('StripePaymentElement.paymentFailed'));
                    return;
                }
                await finishConfirmedPayment(paymentIntent, webIntent, callback);
            } finally {
                setIsLoading(false);
            }
        },
        [webIntent, finishConfirmedPayment, t]
    );

    const handleCompleteOrder = useCallback(
        async (callback) => {
            // Already paid: only the order remains to be created.
            if (pendingCapture) {
                return finishPendingOrder(callback);
            }
            return handleCompleteOrderWithElement(callback);
        },
        [pendingCapture, finishPendingOrder, handleCompleteOrderWithElement]
    );

    // Fetch service quote whenever location or cart contents change
    useEffect(() => {
        // No address yet (e.g. just signed in from checkout): nothing to quote until one is chosen.
        if (!cart || checkoutOptions.pickup || !deliveryLocation) {
            return;
        }

        let destination = deliveryLocation.isSaved ? deliveryLocation : getCoordinates(deliveryLocation);
        let isMounted = true;
        const fetchServiceQuote = async () => {
            setServiceQuote(null);
            // A new address or cart gets a fresh try; an earlier failure shouldn't stick.
            setIsServiceQuoteUnavailable(false);
            setUnavailableItems(null);
            try {
                const quote = await getServiceQuote(quoteOrigin ?? currentStoreLocation, destination, cart);
                if (isMounted) {
                    setServiceQuote(quote);
                }
            } catch (error) {
                if (isMounted) {
                    setIsServiceQuoteUnavailable(true);
                    setUnavailableItems(unavailableItemsFromError(error));
                }
                console.warn('Error fetching service quote:', error);
            }
        };

        fetchServiceQuote();

        return () => {
            isMounted = false;
        };
    }, [cartContentsString, checkoutOptions?.pickup, deliveryLocation?.id, quoteOrigin]);

    // Memoize the return value to provide stable references
    const checkout = useMemo(
        () => ({
            cart,
            storefront,
            customer,
            totalAmount,
            lineItems,
            checkoutOptions,
            serviceQuote,
            deliveryLocation,
            paymentMethod,
            setPaymentMethod,
            stripeLoading,
            isLoading,
            handleDeliveryLocationChange,
            setTipOptions,
            isPickupEnabled,
            setPickup,
            isPickup: !!checkoutOptions.pickup,
            paymentSheetEnabled,
            attachStripe,
            elementsOptions,
            handlePaymentElementChange,
            handlePaymentMethodChange,
            handleCompleteOrder,
            handleRedirectReturn,
            pendingCapture,
            finishPendingOrder,
            setStripeLoading,
            setupIntentLoading,
            error,
            isReady,
            orderNotes,
            setOrderNotes,
            foodTruckId,
            storeLocationId,
            originLocationId: quoteOrigin ?? foodTruckId ?? storeLocationId,
            storeLocationIds,
            isNotReady: !isReady,
            isServiceQuoteUnavailable,
            unavailableItems,
            isBelowMinimum,
            minimumCheckoutAmount,
            isMinimumCheckoutEnabled,
            subtotal,
        }),
        [
            cart,
            storefront,
            customer,
            totalAmount,
            lineItems,
            checkoutOptions,
            serviceQuote,
            deliveryLocation,
            paymentMethod,
            stripeLoading,
            isLoading,
            handleDeliveryLocationChange,
            setTipOptions,
            isPickupEnabled,
            setPickup,
            checkoutOptions.pickup,
            paymentSheetEnabled,
            attachStripe,
            elementsOptions,
            handlePaymentElementChange,
            handlePaymentMethodChange,
            handleCompleteOrder,
            handleRedirectReturn,
            pendingCapture,
            finishPendingOrder,
            setStripeLoading,
            setupIntentLoading,
            error,
            isReady,
            orderNotes,
            setOrderNotes,
            foodTruckId,
            storeLocationId,
            storeLocationIds,
            quoteOrigin,
            isServiceQuoteUnavailable,
            unavailableItems,
            isBelowMinimum,
            minimumCheckoutAmount,
            isMinimumCheckoutEnabled,
            subtotal,
        ]
    );

    return checkout;
}
