import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, TouchableOpacity, Text, Image, ActivityIndicator } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import tailwind from '../tailwind';
import Storefront, { Category } from '@fleetbase/storefront';
import formatCurrency from '../utils/format-currency';
import { useStorefrontSdk } from '../utils';

const CategoryScreen = ({ navigation, route }) => {
    const { attributes, key } = route.params;
    const storefront = useStorefrontSdk();
    const category = new Category(attributes);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // load products for category
    useEffect(() => {
        storefront.products.query({ category: category.id }).then((products) => {
            setProducts(products);
            setIsLoading(false);
        });
    }, []);

    return (
        <SafeAreaView style={tailwind('bg-white')}>
            <View style={tailwind('bg-white h-full w-full p-4')}>
                <View style={tailwind('flex flex-row items-center mb-6')}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                        <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                        </View>
                    </TouchableOpacity>
                    <Text style={tailwind('text-xl font-semibold')}>{category.getAttribute('name')}</Text>
                    {isLoading && (
                        <View style={tailwind('ml-4')}>
                            <ActivityIndicator />
                        </View>
                    )}
                </View>
                <View style={tailwind('flex flex-row')}>
                    {products.map((product) => (
                        <TouchableOpacity key={product.id} style={tailwind('w-1/2')} onPress={() => navigation.navigate('ProductScreen', { attributes: product.serialize(), key })}>
                            <View>
                                <View style={tailwind('p-2')}>
                                    <View style={tailwind('bg-gray-50 py-2 px-3 flex items-center justify-center')}>
                                        <Image source={{ uri: product.getAttribute('primary_image_url') }} style={tailwind('h-28 w-28')} />
                                    </View>
                                    <View style={tailwind('flex p-2')}>
                                        <Text style={tailwind('font-semibold mb-1')}>{product.getAttribute('name')}</Text>
                                        {product.isOnSale && (
                                            <View style={tailwind('flex flex-row')}>
                                                <Text style={tailwind('font-bold mr-1')}>{formatCurrency(product.getAttribute('sale_price') / 100, product.getAttribute('currency'))}</Text>
                                                <Text style={tailwind('line-through text-xs text-gray-400')}>
                                                    {formatCurrency(product.getAttribute('price') / 100, product.getAttribute('currency'))}
                                                </Text>
                                            </View>
                                        )}
                                        {!product.isOnSale && (
                                            <View style={tailwind('flex flex-row')}>
                                                <Text style={tailwind('text-center font-bold')}>{formatCurrency(product.getAttribute('price') / 100, product.getAttribute('currency'))}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </SafeAreaView>
    );
};

export default CategoryScreen;
