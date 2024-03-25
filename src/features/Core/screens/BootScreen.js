import SetupWarningScreen from 'exceptions/SetupWarningScreen';
import { useStorefront } from 'hooks';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, View } from 'react-native';
import RNBootSplash from 'react-native-bootsplash';
import { tailwind } from 'tailwind';
import { hasRequiredKeys, logError } from 'utils';
import { setI18nConfig } from 'utils/Localize';
import { set } from 'utils/Storage';

/**
 * BootScreen is a simple initialization screen, will load
 * the store or network information and navigate to the correct
 * screens.
 *
 * @component
 */
const BootScreen = ({ navigation }) => {
    const [error, setError] = useState(null);
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

    // Initialize i18n
    setI18nConfig();

    useEffect(() => {
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
                setError(error);
                logError(error, '[  Error fetching storefront info!  ]');
            })
            .finally(() => {
                setTimeout(() => {
                    RNBootSplash.hide();
                }, 300);
            });
    }, []);

    if (error) {
        return <SetupWarningScreen error={error} />;
    }

    return (
        <SafeAreaView style={tailwind('bg-white')}>
            <View style={tailwind('flex items-center justify-center w-full h-full bg-white')}>
                <ActivityIndicator size="large" color={tailwind('text-gray-900')} />
            </View>
        </SafeAreaView>
    );
};

export default BootScreen;
