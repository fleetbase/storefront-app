import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { useAuth } from '../contexts/AuthContext';
import { getServiceQuote } from '../utils/checkout';
import { numbersOnly } from '../utils/format';
import { percentage, calculateTip } from '../utils/math';
import { getCoordinates } from '../utils/location';
import { get, storefrontConfig } from '../utils';
import useStorefront from '../hooks/use-storefront';
import useCurrentLocation from '../hooks/use-current-location';
import useStoreLocations from '../hooks/use-store-locations';
import useStorefrontInfo from '../hooks/use-storefront-info';
import useSocketClusterClient from '../hooks/use-socket-cluster-client';
import useCart from '../hooks/use-cart';
import useStorage from '../hooks/use-storage';

export default function useQPayCheckout({ onOrderComplete }) {
    const { storefront } = useStorefront();
    const { info } = useStorefrontInfo();
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
    const [error, setError] = useState(false);
    const [orderNotes, setOrderNotes] = useStorage(`${customer?.id ?? 'anon'}_order_notes`, '');
    const listenerRef = useRef();
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

    const setupGateway = useCallback(async () => {
        if (!storefront || !customer || !cart || !serviceQuote) {
            return;
        }

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

    const handlePayment = useCallback(
        async (payment) => {
            if (!checkoutToken || !storefront || !cart) {
                return;
            }

            setIsLoading(true);

            const status = payment.payment_status;
            if (status === 'PAID') {
                try {
                    const order = await storefront.checkout.captureOrder(checkoutToken, { notes: orderNotes });
                    const emptiedCart = await cart.empty();
                    updateCart(emptiedCart);

                    if (typeof onOrderComplete === 'function') {
                        onOrderComplete(order);
                    }
                } catch (error) {
                    console.error('Error capturing order:', error);
                    toast.error(error.message, { position: ToastPosition.BOTTOM });
                } finally {
                    setIsLoading(false);
                }
            } else {
                console.error('Payment status uknown:', status);
                setError('Payment status uknown:', status);
                setIsLoading(false);
            }
        },
        [storefront, cart, checkoutToken]
    );

    const handlePaymentError = useCallback(({ error, message }) => {
        if (error === 'PAYMENT_NOTFOUND') {
            return;
        }

        toast.error(message, { position: ToastPosition.BOTTOM });
    });

    useEffect(() => {
        setupGateway();
    }, [setupGateway, customer, cart, serviceQuote]);

    useEffect(() => {
        if (!cart) {
            return;
        }

        let destination = deliveryLocation.isSaved ? deliveryLocation : getCoordinates(deliveryLocation);
        let isMounted = true;
        const fetchServiceQuote = async () => {
            setServiceQuote(null);
            try {
                const quote = await getServiceQuote(currentStoreLocation, destination, cart);
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
    }, [cartContentsString, cart, deliveryLocation?.id]);

    useEffect(() => {
        if (!checkoutId || !checkoutToken || listenerRef.current) {
            return;
        }

        const listenForPaymentStatus = async () => {
            const listener = await listen(`checkout.${checkoutId}`, (event) => {
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
                listenerRef.current.stop();
            }
        };
    }, [listen, checkoutId, checkoutToken]);

    useFocusEffect(
        useCallback(() => {
            if (!checkoutId || !checkoutToken) {
                return;
            }

            // Check qpay payment status
            const checkPayment = async () => {
                try {
                    const { payment, error } = await storefront.adapter.get('checkouts/capture-qpay', { checkout: checkoutId, respond: 1 });
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
            };

            checkPayment();
        }, [checkoutId, checkoutToken])
    );

    return {
        cart,
        storefront,
        customer,
        totalAmount,
        lineItems,
        checkoutOptions,
        serviceQuote,
        deliveryLocation,
        isLoading,
        invoice,
        checkoutId,
        checkoutToken,
        handleDeliveryLocationChange,
        setTipOptions,
        isPickupEnabled,
        setPickup,
        isPickup: !!checkoutOptions.pickup,
        error,
        isReady,
        isNotReady,
        orderNotes,
        setOrderNotes,
        listener: listenerRef.current,
    };
}
