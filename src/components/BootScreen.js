import React from 'react';
import { SafeAreaView, View, ActivityIndicator } from 'react-native';
import Config from 'react-native-config';
import tailwind from '../tailwind';
import Storefront from '@fleetbase/storefront';

const BootScreen = ({ navigation }) => {
    const key = Config.STOREFRONT_KEY;
    const storefront = new Storefront(key, { host: 'https://v2api.fleetbase.engineering' });

    storefront.about().then((info) => {
        if (info.is_store) {
            // go to storefront view
            return navigation.navigate('StorefrontScreen', { info, key });
        }
    });

    return (
        <SafeAreaView style={tailwind('bg-white')}>
            <View style={tailwind('flex items-center justify-center w-full h-full bg-white')}>
                <ActivityIndicator size="large" color={tailwind('text-gray-900')} />
            </View>
        </SafeAreaView>
    );
};

export default BootScreen;
