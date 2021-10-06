import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, ImageBackground, TouchableOpacity } from 'react-native';
import { useStorefront } from 'hooks';
import tailwind from 'tailwind';
// import CategoryProductSlider from '../shared/CategoryProductSlider';
// import StorefrontHeader from '../interface/StorefrontHeader';

const ExploreScreen = ({ navigation, route }) => {
    const { info } = route.params;
    // const storefront = useStorefront();

    useEffect(() => {}, []);

    return (
        <View style={tailwind('bg-white h-full z-10')}>
            {/* <StorefrontHeader info={info} /> */}
            <View style={tailwind('border-b border-gray-100')}>
                <Text style={tailwind('text-lg font-semibold mb-3 p-4')}>Network Explore</Text>
            </View>
        </View>
    );
};

export default ExploreScreen;
