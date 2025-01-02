import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStripe, initStripe } from '@stripe/stripe-react-native';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { useAuth } from '../contexts/AuthContext';
import { getServiceQuote } from '../utils/checkout';
import { numbersOnly } from '../utils/format';
import { percentage, calculateTip } from '../utils/math';
import { get } from '../utils';
import { config, storefrontConfig } from '../utils';
import useStorefront from '../hooks/use-storefront';
import useCart from '../hooks/use-cart';
import useCurrentLocation from '../hooks/use-current-location';
import useStoreLocations from '../hooks/use-store-locations';
import useStorefrontInfo from '../hooks/use-storefront-info';

const APP_IDENTIFIER = config('APP_IDENTIFIER');
const STRIPE_KEY = config('STRIPE_KEY');

export default function useStripeCheckout({ onOrderComplete }) {
    const { storefront } = useStorefront();
    const { info } = useStorefrontInfo();
    const [cart, updateCart] = useCart();
    const { customer, updateCustomerMeta } = useAuth();
    const { currentLocation: deliveryLocation, updateDefaultLocation } = useCurrentLocation();
    const { currentStoreLocation } = useStoreLocations();
    const { confirmPayment, confirmSetupIntent, initPaymentSheet, presentPaymentSheet, confirmPaymentSheetPayment } = useStripe();
    const [checkoutOptions, setCheckoutOptions] = useState({
        leavingTip: false,
        tip: 0,
        leavingDeliveryTip: false,
        deliveryTip: 0,
        pickup: 0,
    });
    const [serviceQuote, setServiceQuote] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [stripeLoading, setStripeLoading] = useState(false);
    const [stripeInitialized, setStripeInitialized] = useState(false);
    const [setupIntentLoading, setSetupIntentLoading] = useState(false);
    const [paymentIntentId, setPaymentIntentId] = useState(null);
    const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
    const [setupIntentClientSecret, setSetupIntentClientSecret] = useState(null);
    const [error, setError] = useState(null);
    const cartContentsString = JSON.stringify(cart.contents() || []);
    const subtotal = cart.subtotal();
    const totalAmount = useMemo(() => {
        const lineItems = computeLineItems();
        const totalItem = lineItems.find((item) => item.name === 'Total');
        return totalItem ? totalItem.value : 0;
    }, [checkoutOptions, subtotal, serviceQuote]);
    const isReady = serviceQuote && !isLoading && !stripeLoading;
    const isPickupEnabled = get(info, 'options.pickup_enabled') === true;

    function computeLineItems() {
        const baseItems = [
            {
                name: 'Cart Subtotal',
                value: subtotal,
            },
        ];

        if (checkoutOptions.leavingTip) {
            baseItems.push({
                name: 'Tip',
                value: calculateTip(checkoutOptions.tip, subtotal),
                tip: checkoutOptions.tip,
            });
        }

        if (checkoutOptions.leavingDeliveryTip) {
            baseItems.push({
                name: 'Delivery Tip',
                value: calculateTip(checkoutOptions.deliveryTip, subtotal),
                tip: checkoutOptions.deliveryTip,
            });
        }

        if (!checkoutOptions.pickup) {
            if (serviceQuote) {
                baseItems.push({
                    name: 'Service Fee',
                    value: serviceQuote.getAttribute('amount'),
                });
            } else if (deliveryLocation?.id) {
                baseItems.push({
                    name: 'Service Fee',
                    value: 0,
                    loading: true,
                });
            }
        }

        const total = baseItems.reduce((acc, item) => acc + numbersOnly(item.value), 0);
        baseItems.push({
            name: 'Total',
            value: total,
        });

        return baseItems;
    }

    const lineItems = useMemo(() => computeLineItems(), [checkoutOptions, subtotal, serviceQuote]);

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

    const createPaymentSheet = useCallback(
        async (onPaymentSheetReady) => {
            if (!customer || !storefront) {
                return;
            }

            setStripeLoading(true);

            try {
                const { paymentIntent, clientSecret, ephemeralKey, customerId, token } = await storefront.checkout.initialize(customer, cart, serviceQuote, 'stripe', checkoutOptions);
                const { error, paymentOption } = await initPaymentSheet({
                    customerId,
                    customerEphemeralKeySecret: ephemeralKey,
                    paymentIntentClientSecret: clientSecret,
                    customFlow: true,
                    ...storefrontConfig('stripePaymentSheetOptions'),
                    testEnv: typeof STRIPE_KEY === 'string' && STRIPE_KEY.startsWith('pk_test'),
                    merchantCountryCode: info.country ?? 'US',
                    style: 'alwaysLight',
                    merchantDisplayName: info.name,
                    returnURL: `${APP_IDENTIFIER}://stripe-redirect`,
                });

                if (error) {
                    setError(error.message);
                    return;
                }

                setPaymentIntentId(paymentIntent);
                setPaymentSheetEnabled(true);
                // Set the payment method
                if (paymentOption) {
                    setPaymentMethod(paymentOption);
                }
                if (typeof onPaymentSheetReady === 'function') {
                    onPaymentSheetReady(paymentOption);
                }
            } catch (error) {
                console.error('Error creating payment sheet:', error);
                setError(error.message);
                toast.error(error.message, { position: ToastPosition.BOTTOM });
            } finally {
                setStripeLoading(false);
            }
        },
        [customer, cart, storefront, serviceQuote, checkoutOptions, checkoutOptions.pickup]
    );

    const createSetupIntent = useCallback(async () => {
        if (!customer || !storefront) {
            return null;
        }

        setSetupIntentLoading(true);

        try {
            const { clientSecret, defaultPaymentMethod } = await storefront.checkout.createStripeSetupIntent(customer);
            setSetupIntentClientSecret(clientSecret);
            if (defaultPaymentMethod) {
                setPaymentMethod(defaultPaymentMethod);
            }
            return clientSecret;
        } catch (err) {
            console.error('Error creating setup payment intent:', err);
            setError('Failed to initialize checkout.');
            throw err;
        } finally {
            setSetupIntentLoading(false);
        }
    }, [storefront, customer]);

    const createPaymentMethodObjectFromPaymentIntent = (paymentIntent) => {
        const {
            paymentMethod: { Card },
            paymentMethodId,
        } = paymentIntent;
        return { ...Card, label: Card.last4, paymentMethodId };
    };

    const handleAddPaymentMethodViaSheet = useCallback(async () => {
        try {
            const { error, paymentOption } = await presentPaymentSheet({
                confirmPayment: false,
            });

            if (error) {
                console.error('Error loading stripe payment sheet:', error);
            } else if (paymentOption) {
                setPaymentMethod(paymentOption);
            } else {
                setPaymentMethod(null);
            }
        } catch (err) {
            console.error('Error saving payment method:', err);
            toast.error('Failed to save payment method.', { position: ToastPosition.BOTTOM });
        }
    }, [presentPaymentSheet, setPaymentMethod]);

    const handleAddPaymentMethod = useCallback(
        async (callback) => {
            if (!setupIntentClientSecret) {
                toast.error('No setup intent available. Please try again.', { position: ToastPosition.BOTTOM });
                return;
            }

            setStripeLoading(true);
            try {
                const { setupIntent, error } = await confirmSetupIntent(setupIntentClientSecret, {
                    paymentMethodType: 'Card',
                });

                if (error) {
                    console.error('Error confirming setup intent:', error);
                    toast.error(error.message, { position: ToastPosition.BOTTOM });
                } else if (setupIntent && setupIntent.paymentMethodId) {
                    await updateCustomerMeta({ stripe_payment_method_id: setupIntent.paymentMethodId });

                    const paymentMethod = createPaymentMethodObjectFromPaymentIntent(setupIntent);
                    setPaymentMethod(paymentMethod);
                    if (typeof callback === 'function') {
                        callback(paymentMethod);
                    }
                }
            } catch (err) {
                console.error('Error saving payment method:', err);
                toast.error('Failed to save payment method.', { position: ToastPosition.BOTTOM });
            } finally {
                setStripeLoading(false);
            }
        },
        [setupIntentClientSecret, confirmSetupIntent]
    );

    const handleCompleteOrderViaSheet = useCallback(
        async (callback) => {
            setIsLoading(true);

            try {
                const { clientSecret, token: checkoutToken } = await storefront.checkout.updateStripePaymentIntent(paymentIntentId, customer, cart, serviceQuote, checkoutOptions);
                const paymentMethodData = {};
                if (paymentMethod && typeof paymentMethod.id === 'string') {
                    paymentMethodData.paymentMethodId = paymentMethod.id;
                }
                const { error: paymentError } = await confirmPaymentSheetPayment();

                if (paymentError) {
                    console.error('Error completing order:', paymentError);
                    toast.error(paymentError.message, { position: ToastPosition.BOTTOM });
                } else {
                    const order = await storefront.checkout.captureOrder(checkoutToken);
                    const emptiedCart = await cart.empty();
                    updateCart(emptiedCart);

                    if (!onOrderComplete && typeof callback === 'function') {
                        callback(order);
                    }

                    if (!callback && typeof onOrderComplete === 'function') {
                        onOrderComplete(order);
                    }
                }
            } catch (error) {
                console.error('Error capturing order:', error);
                toast.error(error.message, { position: ToastPosition.BOTTOM });
            } finally {
                setIsLoading(false);
            }
        },
        [customer, cart, updateCart, storefront, serviceQuote, paymentMethod, checkoutOptions, confirmPayment]
    );

    const handleCompleteOrderViaField = useCallback(
        async (callback) => {
            setIsLoading(true);

            try {
                const { clientSecret, token: checkoutToken } = await storefront.checkout.initialize(customer, cart, serviceQuote, 'stripe', checkoutOptions);
                const paymentMethodData = {};
                if (paymentMethod && typeof paymentMethod.id === 'string') {
                    paymentMethodData.paymentMethodId = paymentMethod.id;
                }
                const { paymentIntent, error: paymentError } = await confirmPayment(clientSecret, {
                    paymentMethodType: 'Card',
                    paymentMethodData,
                });

                if (paymentError) {
                    console.error('Error completing order:', paymentError);
                    toast.error(paymentError.message, { position: ToastPosition.BOTTOM });
                } else if (paymentIntent && paymentIntent.status === 'Succeeded') {
                    const order = await storefront.checkout.captureOrder(checkoutToken);
                    const emptiedCart = await cart.empty();
                    updateCart(emptiedCart);

                    if (!onOrderComplete && typeof callback === 'function') {
                        callback(order);
                    }

                    if (!callback && typeof onOrderComplete === 'function') {
                        onOrderComplete(order);
                    }
                }
            } catch (error) {
                console.error('Error capturing order:', error);
                toast.error(error.message, { position: ToastPosition.BOTTOM });
            } finally {
                setIsLoading(false);
            }
        },
        [customer, cart, updateCart, storefront, serviceQuote, paymentMethod, checkoutOptions, confirmPayment]
    );

    const handleCompleteOrder = useCallback(
        async (callback) => {
            if (storefrontConfig('stripePaymentMethod') === 'field') {
                return handleCompleteOrderViaField(callback);
            }

            return handleCompleteOrderViaSheet(callback);
        },
        [customer, cart, updateCart, storefront, serviceQuote, paymentMethod, checkoutOptions, confirmPayment, confirmPaymentSheetPayment]
    );

    // Fetch service quote whenever location or cart contents change
    useEffect(() => {
        if (checkoutOptions.pickup) {
            return;
        }

        let isMounted = true;
        const fetchServiceQuote = async () => {
            setServiceQuote(null);
            try {
                const quote = await getServiceQuote(currentStoreLocation, deliveryLocation, cart);
                if (isMounted) {
                    setServiceQuote(quote);
                }
            } catch (error) {
                toast.error('Unable to calculate delivery fee.', { position: ToastPosition.TOP });
                console.error('Error fetching service quote:', error);
            }
        };

        fetchServiceQuote();

        return () => {
            isMounted = false;
        };
    }, [cartContentsString, checkoutOptions.pickup, deliveryLocation.id]);

    useEffect(() => {
        if (stripeInitialized === false) {
            initStripe({
                publishableKey: STRIPE_KEY,
                merchantIdentifier: APP_IDENTIFIER,
                setReturnUrlSchemeOnAndroid: true,
            });
            setStripeInitialized(true);
        }
    }, [stripeInitialized]);

    return {
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
        setupIntentClientSecret,
        createSetupIntent,
        createPaymentSheet,
        paymentSheetEnabled,
        handleAddPaymentMethod,
        handleAddPaymentMethodViaSheet,
        handlePaymentMethodChange,
        handleCompleteOrderViaField,
        handleCompleteOrderViaSheet,
        handleCompleteOrder,
        setStripeLoading,
        setupIntentLoading,
        error,
        isReady,
        isNotReady: !isReady,
    };
}
