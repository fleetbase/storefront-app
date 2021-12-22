import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import FastImage from 'react-native-fast-image';
import ProductPriceView from 'ui/ProductPriceView';
import { translate } from 'utils';
import { useLocale } from 'hooks';
import tailwind from 'tailwind';

const ProductCard = ({ product, onPress, containerStyle }) => {
    const [locale] = useLocale();

    return (
        <TouchableOpacity onPress={onPress} style={[containerStyle]} disabled={!product.getAttribute('is_available')}>
            <View style={tailwind(`p-2 ${product.getAttribute('is_available') ? 'opacity-100' : 'opacity-50'}`)}>
                <View style={tailwind('bg-gray-50 py-2 px-3 flex items-center justify-center')}>
                    <FastImage source={{ uri: product.getAttribute('primary_image_url') }} style={tailwind('h-28 w-28')} />
                </View>
                <View style={tailwind('flex p-2')}>
                    <View style={tailwind('mb-1.5 flex flex-row items-center')}>
                        <Text style={tailwind('font-semibold')}>{translate(product, 'name')}</Text>
                        {product.getAttribute('is_service') === true && <Text style={tailwind('ml-1 text-blue-500 font-semibold')}>{translate('Components.interface.ProductCard.serviceIndicator')}</Text>}
                    </View>
                    {product.getAttribute('is_available') === false && <View style={tailwind('mb-1.5')}><Text style={tailwind('text-red-500 font-semibold')}>{translate('Components.interface.ProductCard.unavailable')}</Text></View>}
                    <ProductPriceView product={product} textStyle={tailwind('font-bold')} />
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default ProductCard;
