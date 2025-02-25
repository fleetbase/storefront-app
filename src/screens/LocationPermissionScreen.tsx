import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Platform, Linking } from 'react-native';
import { request, PERMISSIONS, RESULTS, check } from 'react-native-permissions';
import { Button, Text, YStack, Image, Stack, AlertDialog } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import useDimensions from '../hooks/use-dimensions';

const LocationPermissionScreen = () => {
    const navigation = useNavigation();
    const { screenWidth } = useDimensions();
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [permissionAttempted, setPermissionAttempted] = useState(false);

    // Function to request location permission
    const requestLocationPermission = async () => {
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

    // Optional: Check permission status when screen regains focus
    const checkPermissionStatus = useCallback(async () => {
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
        <YStack flex={1} bg='$background'>
            <YStack flex={1} alignItems='center' justifyContent='center' padding='$6'>
                <Stack alignItems='center' justifyContent='center'>
                    <Image source={require('../../assets/images/isometric-geolocation-1.png')} width={360} height={360} resizeMode='contain' />
                </Stack>
                <Text fontSize='$8' fontWeight='bold' color='$textPrimary' mb='$2' textAlign='center'>
                    Enable Location Services
                </Text>
                <Text color='$textSecondary' fontSize='$4' textAlign='center' mb='$6'>
                    We need your location to provide a better experience.
                </Text>
                {/* Single button to trigger the permission prompt */}
                <Button size='$5' bg='$primary' color='$white' width='100%' onPress={requestLocationPermission} icon={<FontAwesomeIcon icon={faMapMarkerAlt} color='white' />}>
                    Share Location & Continue
                </Button>
            </YStack>

            {/* Fallback AlertDialog after native prompt denial */}
            <AlertDialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialog.Trigger asChild>
                    <Button display='none'>Show Alert</Button>
                </AlertDialog.Trigger>
                <AlertDialog.Portal>
                    <AlertDialog.Overlay key='overlay' animation='quick' opacity={0.5} />
                    <AlertDialog.Content bordered elevate key='content' backgroundColor='$background' width={screenWidth * 0.9} padding='$6'>
                        <AlertDialog.Title color='$textPrimary' fontSize={27}>
                            Location Permission Required
                        </AlertDialog.Title>
                        <AlertDialog.Description color='$textSecondary' mb='$4'>
                            To enable location-based features, please allow location access. If you prefer, you can enter your location manually.
                        </AlertDialog.Description>
                        {/* Options after the native prompt has been shown */}
                        <Button onPress={openSettings} backgroundColor='$primary' color='$primaryText' mb='$2'>
                            Go to Settings
                        </Button>
                        <Button onPress={navigateToLocationPicker} backgroundColor='$secondary' color='$textSecondary'>
                            Enter Location Manually
                        </Button>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog>
        </YStack>
    );
};

export default LocationPermissionScreen;
