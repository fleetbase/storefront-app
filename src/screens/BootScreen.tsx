import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, ImageBackground } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Image, Spinner, XStack, Text, YStack, useTheme } from 'tamagui';
import { LinearGradient } from 'react-native-linear-gradient';
import { config, toArray, isArray, storefrontConfig } from '../utils';
import { getCurrentLocationFromStorage, requestWebGeolocationPermission } from '../utils/location';
import BootSplash from 'react-native-bootsplash';
import SetupWarningScreen from './SetupWarningScreen';
import useStorefront from '../hooks/use-storefront';
import useStorage from '../hooks/use-storage';
import { useLanguage } from '../contexts/LanguageContext';

const BootScreenWrapper = ({ children, backgroundImage, backgroundColor, theme }) => {
    const bg = (isArray(backgroundColor) ? backgroundColor[0] : backgroundColor) ?? theme.background.val;
    const source = backgroundImage ?? null;

    return source ? (
        <ImageBackground style={[{ flex: 1, width: '100%', height: '100%' }, { backgroundColor: bg }]} source={source} resizeMode='cover'>
            {children}
        </ImageBackground>
    ) : (
        <YStack f={1} w='100%' h='100%' bg={bg}>
            {children}
        </YStack>
    );
};

const APP_NAME = config('APP_NAME');
const BootScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const { storefront, error: storefrontError, hasStorefrontConfig } = useStorefront();
    const currentLocation = getCurrentLocationFromStorage();
    const [info, setInfo] = useStorage('info', {});
    const [error, setError] = useState<Error | null>(null);
    const backgroundColor = toArray(config('BOOTSCREEN_BACKGROUND_COLOR', '$background'));
    const backgroundImage = storefrontConfig('backgroundImages.BootScreen');
    const isGradientBackground = isArray(backgroundColor) && backgroundColor.length > 1;
    const hasBgImage = !!backgroundImage;

    useEffect(() => {
        const checkLocationPermission = async () => {
            if (Platform.OS === 'web') {
                const granted = await requestWebGeolocationPermission();
                if (granted) {
                    return initializeStorefront();
                }
                // If a current location exists, we bypass the permission prompt
                if (currentLocation) {
                    return initializeStorefront();
                }
                // setTimeout(() => BootSplash.hide(), 300);
                return navigation.navigate('LocationPermission');
            }

            const permission = Platform.OS === 'ios' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

            const result = await check(permission);
            if (result === RESULTS.GRANTED) {
                initializeStorefront();
            } else {
                // IF user has manually set their current location bypass location services permission
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
                return setError(new Error(t('BootScreen.missingRequiredConfigurationKeys')));
            }

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
        <BootScreenWrapper backgroundImage={backgroundImage} backgroundColor={backgroundColor} theme={theme}>
            <YStack flex={1} bg={hasBgImage ? 'transparent' : backgroundColor[0]} alignItems='center' justifyContent='center' width='100%' height='100%' pt={insets.top} pb={insets.bottom}>
                {isGradientBackground && (
                    <LinearGradient
                        colors={backgroundColor}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            height: '100%',
                            width: '100%',
                        }}
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
