import React from 'react';
import { SafeAreaView, View, Text } from 'react-native';
import tailwind from '../../tailwind';

const StorefrontAccountScreen = ({ navigation }) => {
    return (
        <SafeAreaView style={tailwind('bg-white')}>
            <View style={tailwind('flex items-center justify-center w-full h-full bg-white')}>
                <Text>Account Screen</Text>
            </View>
        </SafeAreaView>
    );
};

export default StorefrontAccountScreen;
