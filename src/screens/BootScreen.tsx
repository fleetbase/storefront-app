import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Image, Spinner, XStack, Text, YStack, useTheme } from 'tamagui';
import { setI18nConfig } from '../utils/localize';
import { config } from '../utils';
import BootSplash from 'react-native-bootsplash';
import useStorefront from '../hooks/use-storefront';
import useStorage from '../hooks/use-storage';
import useCurrentLocation from '../hooks/use-current-location';
import SetupWarningScreen from './SetupWarningScreen';

const APP_NAME = config('APP_NAME');
const BootScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { storefront, error: storefrontError, hasStorefrontConfig } = useStorefront();
    const { currentLocation } = useCurrentLocation();
    const [info, setInfo] = useStorage('info', {});
    const [error, setError] = useState<Error | null>(null);
    // console.log('[BootScreen #currentLocation]', currentLocation);

    useEffect(() => {
        const checkLocationPermission = async () => {
            const permission = Platform.OS === 'ios' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

            const result = await check(permission);
            if (result === RESULTS.GRANTED) {
                initializeStorefront();
            } else {
                // if user has manually set their current location bypass location services permission
                if (currentLocation) {
                    return initializeStorefront();
                }

                // Hide BootSplash
                setTimeout(() => BootSplash.hide(), 300);
                navigation.navigate('LocationPermission');
            }
        };

        const initializeStorefront = async () => {
            if (!hasStorefrontConfig()) {
                return setError(new Error('Missing required configuration keys'));
            }

            // setI18nConfig();

            try {
                if (!storefront) {
                    return;
                }

                const info = await storefront.about();
                setInfo(info);

                // Navigate based on storefront type
                navigation.navigate(info.is_network ? 'NetworkHome' : 'StoreNavigator', { info });
            } catch (initializationError) {
                setError(initializationError);
            } finally {
                setTimeout(() => BootSplash.hide(), 300);
            }
        };

        checkLocationPermission();
    }, [storefront, navigation]);

    if (error || storefrontError) {
        return <SetupWarningScreen error={error || storefrontError} />;
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.$background.val }}>
            <YStack flex={1} alignItems='center' justifyContent='center' bg='$background'>
                <Image source={require('../../assets/app-icon.png')} width={100} height={100} borderRadius='$4' />
                <XStack mt='$2' alignItems='center' justifyContent='center' space='$3'>
                    <Spinner size='small' color='$textSecondary' />
                </XStack>
            </YStack>
        </SafeAreaView>
    );
};

export default BootScreen;
