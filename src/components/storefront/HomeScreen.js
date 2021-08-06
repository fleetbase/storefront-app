import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, ImageBackground, TouchableOpacity } from 'react-native';
import { useStorefrontSdk } from '../../utils';
import tailwind from '../../tailwind';
import CategoryProductSlider from '../shared/CategoryProductSlider';
import Header from './Header';

const StorefrontHomeScreen = ({ navigation, route }) => {
    const { info } = route.params;
    const storefront = useStorefrontSdk();
    const [categories, setCategories] = useState([]);

    // get categories
    useEffect(() => {
        storefront.categories.findAll().then((categories) => {
            setCategories(categories);
        });
    }, []);

    return (
        <View style={tailwind('bg-white h-full z-10')}>
            <Header info={info} />
            <ScrollView style={tailwind('p-4 z-10')}>
                <Text style={tailwind('text-lg font-semibold mb-3')}>Shop by category</Text>
                <View style={tailwind('w-full')}>
                    <View style={tailwind('flex flex-row flex-wrap')}>
                        {categories.map((category) => {
                            return (
                                <TouchableOpacity key={category.id} onPress={() => navigation.navigate('CategoryScreen', { attributes: category.serialize() })}>
                                    <View style={tailwind('rounded-full px-4 py-2 bg-gray-200 mr-3 mb-3')}>
                                        <Text>{category.getAttribute('name')}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <View style={tailwind('flex flex-row flex-wrap pb-40')}>
                        {categories.map((category, index) => (
                            <CategoryProductSlider key={index} category={category} style={tailwind('w-full my-4')} />
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

export default StorefrontHomeScreen;
