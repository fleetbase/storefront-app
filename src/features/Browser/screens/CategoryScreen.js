import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, TouchableOpacity, Text, Image, ActivityIndicator } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useStorefront } from 'hooks';
import { formatCurrency } from 'utils';
import Storefront, { Category } from '@fleetbase/storefront';
import ProductCard from 'ui/ProductCard';
import tailwind from 'tailwind';

const CategoryScreen = ({ navigation, route }) => {
    const { attributes } = route.params;

    const storefront = useStorefront();
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
                    {products.map((product, index) => (
                        <ProductCard key={index} product={product} containerStyle={tailwind('w-1/2')} onPress={() => navigation.navigate('ProductScreen', { attributes: product.serialize() })} />
                    ))}
                </View>
            </View>
        </SafeAreaView>
    );
};

export default CategoryScreen;
