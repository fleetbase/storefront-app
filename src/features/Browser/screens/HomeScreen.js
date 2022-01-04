import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, ImageBackground, TouchableOpacity } from 'react-native';
import { useStorefront, useLocale } from 'hooks';
import { translate } from 'utils';
import CategoryProductSlider from 'ui/CategoryProductSlider';
import StorefrontHeader from 'ui/headers/StorefrontHeader';
import tailwind from 'tailwind';

const HomeScreen = ({ navigation, route }) => {
    const { info } = route.params;

    const storefront = useStorefront();
    const [locale, setLocale] = useLocale();
    const [categories, setCategories] = useState([]);

    // get categories
    useEffect(() => {
        storefront.categories.findAll().then((categories) => {
            setCategories(categories);
        });
    }, []);

    return (
        <View style={tailwind('bg-white h-full z-10')}>
            <StorefrontHeader info={info} />
            <View style={tailwind('border-b border-gray-100')}>
                <Text style={tailwind('text-lg font-semibold mb-3 p-4')}>{translate('Browser.HomeScreen.categoryPickerHeaderTitle')}</Text>
                <View style={tailwind('pb-2')}>
                    <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} style={tailwind('flex flex-row px-4')}>
                        {categories.map((category) => {
                            return (
                                <TouchableOpacity key={category.id} onPress={() => navigation.navigate('CategoryScreen', { attributes: category.serialize() })}>
                                    <View style={tailwind('rounded-full px-4 py-2 bg-gray-200 ml-4 mb-3')}>
                                        <Text>{translate(category, 'name')}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
            <ScrollView style={tailwind('z-10')} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                <View style={tailwind('flex flex-row flex-wrap px-4 pb-40')}>
                    {categories.map((category, index) => (
                        <CategoryProductSlider key={index} category={category} style={tailwind('w-full my-4')} />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

export default HomeScreen;
