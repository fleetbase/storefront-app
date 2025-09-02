import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency } from 'utils';
import tailwind from 'tailwind';

const ProductPriceView = ({ product, style, textStyle }) => (
    <View style={style}>
        {product.isOnSale && (
            <View style={tailwind('flex flex-row')}>
                <Text style={[tailwind('mr-1'), textStyle]}>{formatCurrency(product.getAttribute('sale_price'), product.getAttribute('currency'))}</Text>
                <Text style={[tailwind('line-through text-gray-400'), textStyle]}>{formatCurrency(product.getAttribute('price'), product.getAttribute('currency'))}</Text>
            </View>
        )}
        {!product.isOnSale && (
            <View>
                <Text style={textStyle}>{formatCurrency(product.getAttribute('price'), product.getAttribute('currency'))}</Text>
            </View>
        )}
    </View>
);

export default ProductPriceView;
