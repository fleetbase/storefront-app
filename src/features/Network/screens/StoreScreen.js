import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, Image, ImageBackground, TouchableOpacity } from 'react-native';
import { Collection } from '@fleetbase/sdk';
import { Store } from '@fleetbase/storefront';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { NetworkInfoService } from 'services';
import { useResourceCollection } from 'utils/Storage';
import NetworkHeader from 'ui/headers/NetworkHeader';
import CategoryProductSlider from 'ui/CategoryProductSlider';
import tailwind from 'tailwind';

const StoreScreen = ({ navigation, route }) => {
    const { info, data } = route.params;

    const storefront = useStorefront();
    const [categories, setCategories] = useState([]);
    const store = new Store(data);

    // get categories
    useEffect(() => {
        storefront.categories.query({ store: store.id }).then((categories) => {
            setCategories(categories);
        });
    }, []);

    return (
        <View style={tailwind('bg-white h-full z-10')}>
            <NetworkHeader info={info} />
            <View style={tailwind('border-b border-gray-100')}>
                <Text style={tailwind('text-lg font-semibold mb-3 p-4')}>Shop by category</Text>
                <View style={tailwind('pb-2')}>
                    <ScrollView horizontal={true} style={tailwind('flex flex-row px-4')}>
                        {categories.map((category) => {
                            return (
                                <TouchableOpacity key={category.id} onPress={() => navigation.navigate('CategoryScreen', { attributes: category.serialize() })}>
                                    <View style={tailwind('rounded-full px-4 py-2 bg-gray-200 ml-4 mb-3')}>
                                        <Text>{category.getAttribute('name')}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
            <ScrollView style={tailwind('z-10')}>
                <View style={tailwind('flex flex-row flex-wrap px-4 pb-40')}>
                    {categories.map((category, index) => (
                        <CategoryProductSlider key={index} category={category} style={tailwind('w-full my-4')} />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

export default StoreScreen;
