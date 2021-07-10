import React from 'react';
import { SafeAreaView, View, ActivityIndicator } from 'react-native';
import { useStorefrontSdk, hasRequiredKeys } from '../utils';
import tailwind from '../tailwind';
import SetupWarningScreen from './SetupWarningScreen';

const BootScreen = ({ navigation }) => {
    // make sure keys are set
    if (!hasRequiredKeys()) {
        return (<SetupWarningScreen />);
    }

    const storefront = useStorefrontSdk();

    storefront.about().then((info) => {
        if (info.is_store) {
            // go to storefront view
            return navigation.navigate('StorefrontScreen', { info });
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
