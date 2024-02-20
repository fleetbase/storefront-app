import React from 'react';
import { Text } from 'react-native';
import { formatCurrency } from 'utils';

const CartSubtotalView = ({ cart, style }) => <Text style={style}>{formatCurrency(cart.subtotal(), cart.getAttribute('currency'))}</Text>;

export default CartSubtotalView;
