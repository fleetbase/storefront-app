import React from 'react';
import { Text } from 'react-native';
import { DeliveryServiceQuote } from '@fleetbase/storefront';
import { formatCurrency } from 'utils';

const CartTotalView = ({ cart, style, tip, deliveryTip, isTipping, isTippingDriver, isPickupOrder }) => {
    const calculateTotal = () => {
        let subtotal = cart.subtotal();

        if (cart.isEmpty) {
            return 0;
        }

        if (isTipping) {
            if (typeof tip === 'string' && tip.endsWith('%')) {
                subtotal += calculatePercentage(parseInt(tip), cart.subtotal());
            } else {
                subtotal += tip;
            }
        }

        if (isTippingDriver && !isPickupOrder) {
            if (typeof deliveryTip === 'string' && deliveryTip.endsWith('%')) {
                subtotal += calculatePercentage(parseInt(deliveryTip), cart.subtotal());
            } else {
                subtotal += deliveryTip;
            }
        }

        if (isPickupOrder) {
            return subtotal;
        }

        return serviceQuote instanceof DeliveryServiceQuote ? subtotal + serviceQuote.getAttribute('amount') : subtotal;
    };

    return <Text style={style}>{formatCurrency(calculateTotal() / 100, cart.getAttribute('currency'))}</Text>;
};

export default CartTotalView;
