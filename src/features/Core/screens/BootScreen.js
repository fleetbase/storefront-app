import React, { useEffect } from 'react';
import { SafeAreaView, View, ActivityIndicator } from 'react-native';
import { initStripe } from '@stripe/stripe-react-native';
import { hasRequiredKeys } from 'utils';
import { useStorefront } from 'hooks';
import { set } from 'utils/Storage';
import { tailwind } from 'tailwind';
import SetupWarningScreen from 'exceptions/SetupWarningScreen';
import config from 'config';

const { STRIPE_KEY, APP_IDENTIFIER } = config;

/**
 * BootScreen is a simple initialization screen, will load 
 * the store or network information and navigate to the correct 
 * screens.
 *
 * @component
 */
const BootScreen = ({ navigation }) => {
    // If the required keys are not provided display the setup warning screen
    if (!hasRequiredKeys()) {
        return <SetupWarningScreen />;
    }

    // Initialize Storefront SDK
    const storefront = useStorefront();

    // If the storefront SDK throws and error display through setup warning
    if (storefront instanceof Error) {
        return <SetupWarningScreen error={storefront} />;
    }

    // Fetch the about() information 
    storefront
        .about()
        .then((info) => {
            // Store storefront/network info
            set('info', info);

            // if is single store only go to storefront screens
            if (info.is_store) {
                return navigation.navigate('StorefrontScreen', { info });
            }

            // if is network/multi-vendor
            if (info.is_network) {
                return navigation.navigate('NetworkScreen', { info });
            }
        })
        .catch((error) => {
            console.log('[  Error fetching storefront info!  ]', error);
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
