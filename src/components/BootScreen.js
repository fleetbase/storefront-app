import React, { useEffect } from 'react';
import { SafeAreaView, View, ActivityIndicator } from 'react-native';
import { initStripe } from '@stripe/stripe-react-native';
import { useStorefrontSdk, hasRequiredKeys } from '../utils';
import { set } from '../utils/storage';
import tailwind from '../tailwind';
import SetupWarningScreen from './SetupWarningScreen';
import Config from 'react-native-config';

const { STRIPE_KEY, APP_IDENTIFIER } = Config;

const sayHello = () => {
    return new Promise((resolve) => {
        resolve('Hello World!');
    });
};

const BootScreen = ({ navigation }) => {
    // make sure keys are set
    if (!hasRequiredKeys()) {
        return <SetupWarningScreen />;
    }

    const storefront = useStorefrontSdk();

    if (storefront instanceof Error) {
        return <SetupWarningScreen error={storefront} />;
    }

    storefront
        .about()
        .then((info) => {
            // if is single store only go to storefront screens
            if (info.is_store) {
                set('info', info);
                return navigation.navigate('StorefrontScreen', { info });
            }

            // if is network/multi-vendor
            if (info.is_network) {
                set('info', info);
                return navigation.navigate('NetworkScreen', { info });
            }
        })
        .catch((error) => {
            console.log('[Error fetching storefront info!]', error);
        });

    useEffect(() => {
        initStripe({
            publishableKey: STRIPE_KEY,
            merchantIdentifier: APP_IDENTIFIER,
        });
    }, []);

    return (
        <SafeAreaView style={tailwind('bg-white')}>
            <View style={tailwind('flex items-center justify-center w-full h-full bg-white')}>
                <ActivityIndicator size="large" color={tailwind('text-gray-900')} />
            </View>
        </SafeAreaView>
    );
};

export default BootScreen;
