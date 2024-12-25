import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { setI18nConfig } from '../utils/localize';
import { Spinner, Stack, Text, YStack, useTheme } from 'tamagui';
import useStorefront from '../hooks/use-storefront';
import useStorage from '../hooks/use-storage';
// import RNBootSplash from 'react-native-bootsplash';
import SetupWarningScreen from './SetupWarningScreen';

const BootScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { storefront, error: storefrontError, hasStorefrontConfig } = useStorefront();
    const [info, setInfo] = useStorage('info', {});
    const [error, setError] = useState<Error | null>(null);
    console.log('[BootScreen]');

    useEffect(() => {
        const checkLocationPermission = async () => {
            const permission = Platform.OS === 'ios' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

            const result = await check(permission);
            if (result === RESULTS.GRANTED) {
                initializeStorefront(); // Continue the boot process if permission is granted
            } else {
                const requestResult = await request(permission);
                if (requestResult === RESULTS.GRANTED) {
                    initializeStorefront();
                } else {
                    // setTimeout(() => RNBootSplash.hide(), 300);
                    navigation.navigate('LocationPermission');
                }
            }
        };

        const initializeStorefront = async () => {
            if (!hasStorefrontConfig()) {
                setError(new Error('Missing required configuration keys'));
                return;
            }

            // setI18nConfig();

            try {
                if (!storefront) return;

                const info = await storefront.about();
                setInfo(info);

                // Navigate based on storefront type
                navigation.navigate(info.is_network ? 'NetworkHome' : 'StoreNavigator', { info });
            } catch (initializationError) {
                setError(initializationError);
            } finally {
                // setTimeout(() => RNBootSplash.hide(), 300);
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
                <Spinner size='large' color='$textSecondary' />
                <Text mt='$4' color='$textPrimary'>
                    Loading Storefront...
                </Text>
            </YStack>
        </SafeAreaView>
    );
};

export default BootScreen;
