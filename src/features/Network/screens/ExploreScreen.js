import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, ImageBackground, TouchableOpacity } from 'react-native';
import { useStorefront } from 'hooks';
import tailwind from 'tailwind';

const ExploreScreen = ({ navigation, route }) => {
    const { info } = route.params;

    useEffect(() => {}, []);

    return (
        <SafeAreaView style={tailwind('bg-white')}>
            <View style={tailwind('bg-white h-full z-10')}>
                <View style={tailwind('border-b border-gray-100')}>
                    <Text style={tailwind('text-lg font-semibold p-4')}>Network Explore</Text>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default ExploreScreen;
