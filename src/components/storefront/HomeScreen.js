import React, { useState, useEffect } from 'react';
import { View, Text, ImageBackground, TouchableOpacity } from 'react-native';
import { useStorefrontSdk } from '../../utils';
import tailwind from '../../tailwind';
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
            <View style={tailwind('p-4 z-10')}>
                <Text style={tailwind('text-lg font-semibold mb-3')}>Shop by category</Text>
                <View style={tailwind('flex flex-row')}>
                    {categories.map((category) => {
                        return (
                            <TouchableOpacity key={category.id} onPress={() => navigation.navigate('CategoryScreen', { attributes: category.serialize() })}>
                                <View style={tailwind('rounded-full px-4 py-2 bg-gray-200 mr-3')}>
                                    <Text>{category.getAttribute('name')}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

export default StorefrontHomeScreen;
