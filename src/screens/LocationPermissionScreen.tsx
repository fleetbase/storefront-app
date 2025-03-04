import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Platform, Linking, SafeAreaView } from 'react-native';
import { request, PERMISSIONS, RESULTS, check } from 'react-native-permissions';
import { Button, Text, YStack, Image, Stack, AlertDialog } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import { requestWebGeolocationPermission } from '../utils/location';
import { useLanguage } from '../contexts/LanguageContext';
import useDimensions from '../hooks/use-dimensions';

const LocationPermissionScreen = () => {
    const navigation = useNavigation();
    const { screenWidth } = useDimensions();
    const { t } = useLanguage();
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [permissionAttempted, setPermissionAttempted] = useState(false);

    // Function to request location permission
    const requestLocationPermission = async () => {
        if (Platform.OS === 'web') {
            // Use the browser Permissions API (and geolocation prompt) on web
            const granted = await requestWebGeolocationPermission();
            setPermissionAttempted(true);
            setHasPermission(granted);
            if (granted) {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Boot' }],
                });
            } else {
                setDialogOpen(true);
            }
            return;
        }

        const permission = Platform.OS === 'ios' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
        const result = await request(permission);
        setPermissionAttempted(true);
        setHasPermission(result === RESULTS.GRANTED);

        if (result === RESULTS.GRANTED) {
            navigation.reset({
                index: 0,
                routes: [{ name: 'Boot' }],
            });
        } else {
            // Open fallback dialog after denial
            setDialogOpen(true);
        }
    };

    const checkPermissionStatus = useCallback(async () => {
        if (Platform.OS === 'web') {
            const granted = await requestWebGeolocationPermission();
            if (granted) {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Boot' }],
                });
            }
            return;
        }

        const permission = Platform.OS === 'ios' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
        const result = await check(permission);
        if (result === RESULTS.GRANTED) {
            navigation.reset({
                index: 0,
                routes: [{ name: 'Boot' }],
            });
        }
    }, [navigation]);

    useFocusEffect(
        useCallback(() => {
            checkPermissionStatus();
        }, [checkPermissionStatus])
    );

    // Automatically trigger the native permission prompt when the screen mounts
    useEffect(() => {
        if (!permissionAttempted) {
            requestLocationPermission();
        }
    }, [permissionAttempted]);

    // Function to open Settings
    const openSettings = () => {
        Linking.openSettings();
        setDialogOpen(false);
    };

    // Fallback: Allow manual location entry if needed after denial
    const navigateToLocationPicker = () => {
        setDialogOpen(false);
        navigation.navigate('LocationPicker', { redirectTo: 'Boot' });
    };

    return (
        <SafeAreaView>
            <YStack flex={1} bg='$background'>
                <YStack flex={1} alignItems='center' justifyContent='center' padding='$6'>
                    <Stack alignItems='center' justifyContent='center'>
                        <Image source={require('../../assets/images/isometric-geolocation-1.png')} width={360} height={360} resizeMode='contain' />
                    </Stack>
                    <Text fontSize='$8' fontWeight='bold' color='$textPrimary' mb='$2' textAlign='center'>
                        {t('LocationPermissionScreen.enableLocationServices')}
                    </Text>
                    <Text color='$textSecondary' fontSize='$4' textAlign='center' mb='$6'>
                        {t('LocationPermissionScreen.enableLocationPrompt')}
                    </Text>
                    <Button size='$5' bg='$primary' color='$white' width='100%' onPress={requestLocationPermission} icon={<FontAwesomeIcon icon={faMapMarkerAlt} color='white' />}>
                        {t('LocationPermissionScreen.shareAndContinue')}
                    </Button>
                </YStack>
                <AlertDialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                    <AlertDialog.Trigger asChild>
                        <Button display='none'>Show Alert</Button>
                    </AlertDialog.Trigger>
                    <AlertDialog.Portal>
                        <AlertDialog.Overlay key='overlay' animation='quick' opacity={0.5} />
                        <AlertDialog.Content bordered elevate key='content' backgroundColor='$background' width={screenWidth * 0.9} padding='$6'>
                            <AlertDialog.Title color='$textPrimary' fontSize={27}>
                                {t('LocationPermissionScreen.locationPermissionRequired')}
                            </AlertDialog.Title>
                            <AlertDialog.Description color='$textSecondary' mb='$4'>
                                {t('LocationPermissionScreen.locationPermissionPrompt')}
                            </AlertDialog.Description>
                            {Platform.OS !== 'web' && (
                                <Button onPress={openSettings} backgroundColor='$primary' color='$primaryText' mb='$2'>
                                    {t('LocationPermissionScreen.goToSettings')}
                                </Button>
                            )}
                            <Button onPress={navigateToLocationPicker} backgroundColor='$secondary' color='$textSecondary'>
                                {t('LocationPermissionScreen.enterLocationManually')}
                            </Button>
                        </AlertDialog.Content>
                    </AlertDialog.Portal>
                </AlertDialog>
            </YStack>
        </SafeAreaView>
    );
};

export default LocationPermissionScreen;
