import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, ImageBackground, StyleSheet } from 'react-native';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Image, Spinner, XStack, YStack, useTheme } from 'tamagui';
import { LinearGradient } from 'react-native-linear-gradient';
import { config, toArray, isArray, storefrontConfig } from '../utils';
import { getCurrentLocationFromStorage, requestWebGeolocationPermission } from '../utils/location';
import BootSplash from 'react-native-bootsplash';
import SetupWarningScreen from './SetupWarningScreen';
import useStorefront from '../hooks/use-storefront';
import { useLanguage } from '../contexts/LanguageContext';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';
import { getStorefrontRoute } from '../utils/marketplace-runtime';

const BootScreenWrapper = ({ children, backgroundImage, backgroundColor, theme }) => {
    const bg = (isArray(backgroundColor) ? backgroundColor[0] : backgroundColor) ?? theme.background.val;
    const source = backgroundImage ?? null;

    return source ? (
        <ImageBackground style={[styles.background, { backgroundColor: bg }]} source={source} resizeMode='cover'>
            {children}
        </ImageBackground>
    ) : (
        <YStack f={1} w='100%' h='100%' bg={bg}>
            {children}
        </YStack>
    );
};

const BootScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const { storefront, error: storefrontError, hasStorefrontConfig } = useStorefront();
    const { initializeOwner } = useStorefrontRuntime();
    const currentLocation = getCurrentLocationFromStorage();
    const [error, setError] = useState<Error | null>(null);
    const backgroundColor = toArray(config('BOOTSCREEN_BACKGROUND_COLOR', '$background'));
    const backgroundImage = storefrontConfig('backgroundImages.BootScreen');
    const isGradientBackground = isArray(backgroundColor) && backgroundColor.length > 1;
    const hasBgImage = !!backgroundImage;

    useEffect(() => {
        let cancelled = false;

        const enterStorefront = (routeName: string, info: any) => {
            navigation.reset({ index: 0, routes: [{ name: routeName, params: { ownerId: info.id } }] });
        };

        const checkStoreLocationPermission = async (info: any) => {
            if (Platform.OS === 'web') {
                const granted = await requestWebGeolocationPermission();
                if (granted || currentLocation) return enterStorefront('StoreNavigator', info);
                return navigation.navigate('LocationPermission');
            }

            const permission = Platform.OS === 'ios' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

            const result = await check(permission);
            if (result === RESULTS.GRANTED || currentLocation) return enterStorefront('StoreNavigator', info);
            navigation.navigate('LocationPermission');
        };

        const initializeStorefront = async () => {
            if (!hasStorefrontConfig()) {
                return setError(new Error(t('BootScreen.missingRequiredConfigurationKeys')));
            }

            try {
                if (!storefront) {
                    return;
                }

                const info = await storefront.about();
                if (cancelled) return;
                initializeOwner(info);

                // Marketplace browsing does not require precise location. Location is
                // requested later, in context, for map/nearest/delivery functionality.
                if (info.is_network) {
                    enterStorefront(getStorefrontRoute(info), info);
                } else {
                    await checkStoreLocationPermission(info);
                }
            } catch (initializationError) {
                setError(initializationError);
            } finally {
                setTimeout(() => BootSplash.hide(), 300);
            }
        };

        initializeStorefront();
        return () => {
            cancelled = true;
        };
    }, [currentLocation, hasStorefrontConfig, initializeOwner, navigation, storefront, t]);

    if (error || storefrontError) {
        return <SetupWarningScreen error={error || storefrontError} />;
    }

    return (
        <BootScreenWrapper backgroundImage={backgroundImage} backgroundColor={backgroundColor} theme={theme}>
            <YStack flex={1} bg={hasBgImage ? 'transparent' : backgroundColor[0]} alignItems='center' justifyContent='center' width='100%' height='100%' pt={insets.top} pb={insets.bottom}>
                {isGradientBackground && (
                    <LinearGradient
                        colors={backgroundColor}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.gradient}
                    />
                )}
                <YStack alignItems='center' justifyContent='center'>
                    <Image source={require('../../assets/splash-screen.png')} width={100} height={100} borderRadius='$4' mb='$1' />
                    <XStack mt='$2' alignItems='center' justifyContent='center' space='$3'>
                        <Spinner size='small' color='$textPrimary' />
                    </XStack>
                </YStack>
            </YStack>
        </BootScreenWrapper>
    );
};

export default BootScreen;

const styles = StyleSheet.create({
    background: { flex: 1, width: '100%', height: '100%' },
    gradient: { position: 'absolute', bottom: 0, height: '100%', width: '100%' },
});
