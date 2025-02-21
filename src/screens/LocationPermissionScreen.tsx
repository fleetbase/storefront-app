import React, { useState, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Platform, Linking } from 'react-native';
import { checkMultiple, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Button, Text, YStack, Image, Stack, XStack, AlertDialog } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import useDimensions from '../hooks/use-dimensions';

const LocationPermissionScreen = () => {
    const navigation = useNavigation();
    const { screenWidth, screenHeight } = useDimensions();
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);

    const requestLocationPermission = async () => {
        const permission = Platform.OS === 'ios' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
        const result = await request(permission);

        if (result === RESULTS.GRANTED) {
            // Reset navigation stack to go back to BootScreen and restart the initialization process
            navigation.reset({
                index: 0,
                routes: [{ name: 'Boot' }],
            });
        } else {
            setDialogOpen(true);
        }
    };

    const handleDeny = () => {
        navigation.navigate('LocationPicker', { redirectTo: 'Boot' });
    };

    const openSettings = () => {
        Linking.openSettings();
        setDialogOpen(false);
    };

    // Function to check if permission has been granted when returning to the screen
    const checkPermissionStatus = useCallback(async () => {
        const permission = Platform.OS === 'ios' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
        const result = await check(permission);

        setHasPermission(result === RESULTS.GRANTED);
        if (result === RESULTS.GRANTED) {
            navigation.reset({
                index: 0,
                routes: [{ name: 'Boot' }],
            });
        } else {
            handleDeny();
        }
    }, [navigation]);

    // Recheck permission status when the screen gains focus
    useFocusEffect(
        useCallback(() => {
            checkPermissionStatus();
        }, [checkPermissionStatus])
    );

    return (
        <YStack flex={1} bg='$background'>
            <YStack flex={1} alignItems='center' justifyContent='center' padding='$6'>
                <YStack flex={1} alignItems='center' justifyContent='center'>
                    <Stack alignItems='center' justifyContent='center'>
                        <Image source={require('../../assets/images/isometric-geolocation-1.png')} width={360} height={360} resizeMode='contain' />
                    </Stack>
                    <Text fontSize='$8' fontWeight='bold' color='$textPrimary' mb='$2' textAlign='center'>
                        Enable Location Services
                    </Text>
                    <Text color='$textSecondary' fontSize='$4' textAlign='center' mb='$6'>
                        We need your location to provide a better experience. Please enable location access.
                    </Text>
                </YStack>
            </YStack>
            <YStack space='$3' alignItems='center' bg='$surface' borderColor='$borderColor' borderTop='1px solid' justifyContent='center' padding='$6' paddingBottom='$10'>
                <Button size='$5' bg='$primary' color='$white' width='100%' onPress={requestLocationPermission} icon={<FontAwesomeIcon icon={faMapMarkerAlt} color='white' />}>
                    {!hasPermission ? 'Share Location & Continue' : 'Continue'}
                </Button>
                <Button size='$5' bg='$secondary' color='$textSecondary' width='100%' onPress={handleDeny}>
                    Continue without Sharing Location
                </Button>
            </YStack>
            <AlertDialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialog.Trigger asChild>
                    <Button display='none'>Show Alert</Button>
                </AlertDialog.Trigger>

                <AlertDialog.Portal padding={0} margin={0}>
                    <AlertDialog.Overlay key='overlay' animation='quick' opacity={0.5} enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
                    <AlertDialog.Content
                        bordered
                        elevate
                        key='content'
                        backgroundColor='$background'
                        width={screenWidth * 0.9}
                        height={screenWidth * 0.5}
                        flexGrow='auto'
                        animation='quick'
                        enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
                        exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
                        x={0}
                        y={0}
                        scale={1}
                        opacity={1}
                    >
                        <YStack flex={1} width='100%' py='$2' space='$4' position='relative'>
                            <YStack>
                                <AlertDialog.Title color='$textPrimary' fontSize={27}>
                                    Location Permission Required
                                </AlertDialog.Title>
                                <AlertDialog.Description color='$textSecondary'>To enable location-based features, please allow location access in your settings.</AlertDialog.Description>
                            </YStack>

                            <YStack position='absolute' bottom={0} left={0} right={0}>
                                <XStack gap='$3' justifyContent='flex-end'>
                                    <AlertDialog.Cancel asChild>
                                        <Button onPress={() => setDialogOpen(false)} backgroundColor='$error' borderWidth={1} borderColor='$errorBorder' color='$errorText'>
                                            Cancel
                                        </Button>
                                    </AlertDialog.Cancel>
                                    <AlertDialog.Action asChild>
                                        <Button theme='active' onPress={openSettings} backgroundColor='$primary' color='$primaryText' borderWidth={1} borderColor='$primaryBorder'>
                                            Go to Settings
                                        </Button>
                                    </AlertDialog.Action>
                                </XStack>
                            </YStack>
                        </YStack>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog>
        </YStack>
    );
};

export default LocationPermissionScreen;
