import React from 'react';
import { storefrontConfig } from '../utils';
import QPayCheckoutScreen from './QPayCheckoutScreen';
import StripeCheckoutScreen from './StripeCheckoutScreen';
import PaypalCheckoutScreen from './PaypalCheckoutScreen';

const CheckoutScreen = () => {
    if (storefrontConfig('paymentGateway') === 'stripe') {
        return <StripeCheckoutScreen />;
    }

    if (storefrontConfig('paymentGateway') === 'qpay') {
        return <QPayCheckoutScreen />;
    }

    if (storefrontConfig('paymentGateway') === 'paypal') {
        return <PaypalCheckoutScreen />;
    }
};

export default CheckoutScreen;
