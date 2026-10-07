import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
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

    const completeOrder = useCallback(() => {
        checkout.handleCompleteOrder((order: any) => {
            navigation.reset({
                index: 1,
                routes: [{ name: firstRouteName(navigation) }, { name: 'Order', params: { order: order.serialize(), justPlaced: true } }],
            });
        });
    }, [checkout, navigation]);

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
