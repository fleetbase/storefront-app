import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStorefront, useLocale } from 'hooks';
import { formatCurrency, translate } from 'utils';
import FastImage from 'react-native-fast-image';
import tailwind from 'tailwind';

const isString = (string) => typeof string === 'string';
const { isArray } = Array;

const CategoryProductSlider = (props) => {
    const navigation = useNavigation();
    const storefront = useStorefront();

    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [locale] = useLocale();

    const category = props.category;

    useEffect(() => {
        storefront.products.query({ category: props.category.id }).then((products) => {
            setProducts(products);
            setIsLoading(false);
        });
    }, []);

    if (!isArray(products) || products.length === 0) {
        return <View />;
    }

    return (
        <View style={props.style}>
            <Text style={tailwind('font-bold mb-3 text-lg')}>{translate(category, 'name')}</Text>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                <View style={tailwind('flex flex-row py-4')}>
                    {products.map((product, index) => (
                        <TouchableOpacity key={index} style={tailwind('w-56 m-4')} onPress={() => navigation.navigate('ProductScreen', { attributes: product.serialize() })}>
                            <View>
                                <View>
                                    <View style={tailwind('bg-gray-50 py-2 px-3 flex items-center justify-center')}>
                                        <FastImage source={{ uri: product.getAttribute('primary_image_url') }} style={tailwind('h-28 w-28')} />
                                    </View>
                                    <View style={tailwind('flex p-2')}>
                                        <View style={tailwind('mb-1.5 flex flex-row items-center')}>
                                            <Text style={tailwind('font-semibold')}>{translate(product, 'name')}</Text>
                                            {product.getAttribute('is_service') === true && <Text style={tailwind('ml-1 text-blue-500 font-semibold')}>(Service)</Text>}
                                        </View>
                                        {product.isOnSale && (
                                            <View style={tailwind('flex flex-row')}>
                                                <Text style={tailwind('font-bold mr-1')}>{formatCurrency(product.getAttribute('sale_price'), product.getAttribute('currency'))}</Text>
                                                <Text style={tailwind('line-through text-xs text-gray-400')}>
                                                    {formatCurrency(product.getAttribute('price'), product.getAttribute('currency'))}
                                                </Text>
                                            </View>
                                        )}
                                        {!product.isOnSale && (
                                            <View style={tailwind('flex flex-row')}>
                                                <Text style={tailwind('text-center font-bold')}>{formatCurrency(product.getAttribute('price'), product.getAttribute('currency'))}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

export default CategoryProductSlider;
