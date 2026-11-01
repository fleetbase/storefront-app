import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { PortalHost } from '@gorhom/portal';
import StripeCardFieldSheet from '../components/StripeCardFieldSheet';
import StripePaymentSheet from '../components/StripePaymentSheet';
import CheckoutLayout from '../components/checkout/CheckoutLayout';
import useFooterOffset from '../hooks/use-footer-offset';
import { useStripeCheckoutContext } from '../contexts/StripeCheckoutContext';
import { storefrontConfig, firstRouteName, wasAccessedFromCartModal } from '../utils';

const StripeCheckoutScreen = () => {
    const navigation = useNavigation<any>();
    const checkout: any = useStripeCheckoutContext();
    const isModalScreen = wasAccessedFromCartModal(navigation);
    const footerOffset = useFooterOffset(isModalScreen);

    const route = useRoute<any>();
    const showOrder = useCallback(
        (order: any) => {
            navigation.reset({
                index: 1,
                routes: [{ name: firstRouteName(navigation) }, { name: 'Order', params: { order: order.serialize(), justPlaced: true } }],
            });
        },
        [navigation]
    );

    const completeOrder = useCallback(() => {
        checkout.handleCompleteOrder(showOrder);
    }, [checkout, showOrder]);

    // Web: back from a bank's check (3-D Secure) or a redirect payment, Stripe adds the intent
    // to the address. Finish the order it paid for, once.
    const clientSecret = route.params?.payment_intent_client_secret;
    const paymentIntent = route.params?.payment_intent;
    const redirect = useMemo(() => (clientSecret && paymentIntent ? { paymentIntent, clientSecret } : null), [clientSecret, paymentIntent]);
    const handledRedirect = useRef<string | null>(null);
    useEffect(() => {
        if (!redirect || typeof checkout.handleRedirectReturn !== 'function' || !checkout.customer || handledRedirect.current === redirect.paymentIntent) return;
        handledRedirect.current = redirect.paymentIntent;
        checkout.handleRedirectReturn(redirect, showOrder);
    }, [checkout, redirect, showOrder]);

    return (
        <>
            <CheckoutLayout
                checkout={checkout}
                payment={storefrontConfig('stripePaymentMethod') === 'field' ? <StripeCardFieldSheet /> : <StripePaymentSheet />}
                paymentReady={Boolean(checkout.paymentMethod)}
                onPlaceOrder={completeOrder}
                footerOffset={footerOffset}
            />
            <PortalHost name='StripeCheckoutPortal' />
        </>
    );
};

export default StripeCheckoutScreen;
