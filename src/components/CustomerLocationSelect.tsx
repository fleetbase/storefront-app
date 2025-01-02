import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Animated, SafeAreaView, Pressable, FlatList, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Spinner, Button, Text, YStack, XStack, Separator, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight, faTimes, faPlus } from '@fortawesome/free-solid-svg-icons';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { useNavigation } from '@react-navigation/native';
import BottomSheet, { BottomSheetView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Portal } from '@gorhom/portal';
import { formattedAddressFromPlace, formatAddressSecondaryIdentifier } from '../utils/location';
import useCurrentLocation from '../hooks/use-current-location';
import useSavedLocations from '../hooks/use-saved-locations';
import PlaceMapView from './PlaceMapView';

const CustomerLocationSelect = ({ onChange, onSelectNewLocation, redirectTo = 'Checkout', ...props }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { currentLocation } = useCurrentLocation();
    const { savedLocations } = useSavedLocations();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['50%'], []);

    // Bottom sheet controls
    const openBottomSheet = () => {
        bottomSheetRef.current?.collapse();
    };

    const closeBottomSheet = () => {
        bottomSheetRef.current?.close();
    };

    const handleLocationSelect = async (place) => {
        closeBottomSheet();

        if (typeof onChange === 'function') {
            onChange(place);
        }
    };

    const handleChangeLocation = () => {
        openBottomSheet();
    };

    const handleSelectNewLocation = () => {
        closeBottomSheet();
        if (typeof onSelectNewLocation === 'function') {
            onSelectNewLocation();
        } else {
            navigation.navigate('LocationPicker', { redirectTo, makeDefault: true });
        }
    };

    return (
        <YStack>
            <Pressable onPress={handleChangeLocation}>
                <YStack bg='$surface' borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' px='$3' py='$3' {...props}>
                    <XStack>
                        <YStack width={100} height={90}>
                            <PlaceMapView place={currentLocation} zoom={2} markerSize='xs' width={100} borderWidth={1} borderColor='$borderColor' />
                        </YStack>
                        <YStack flex={1} px='$3'>
                            <Text size={15} color='$textPrimary' fontWeight='bold' mb={2}>
                                {currentLocation.getAttribute('name') ?? 'Your Location'}
                            </Text>
                            <Text color='$textSecondary'>{formattedAddressFromPlace(currentLocation)}</Text>
                        </YStack>
                        <YStack justifyContent='center'>
                            <FontAwesomeIcon icon={faChevronRight} />
                        </YStack>
                    </XStack>
                </YStack>
            </Pressable>
            <Portal hostName='MainPortal'>
                <BottomSheet
                    ref={bottomSheetRef}
                    index={-1}
                    snapPoints={snapPoints}
                    keyboardBehavior='extend'
                    keyboardBlurBehavior='none'
                    enableDynamicSizing={false}
                    enablePanDownToClose={true}
                    enableOverDrag={false}
                    style={{ flex: 1, width: '100%' }}
                    backgroundStyle={{ backgroundColor: theme.surface.val, borderWidth: 1, borderColor: theme.borderColorWithShadow.val }}
                    handleIndicatorStyle={{ backgroundColor: theme.secondary.val }}
                >
                    <BottomSheetView style={{ flex: 1, backgroundColor: theme.surface.val }}>
                        <YStack>
                            <XStack alignItems='center' justifyContent='space-between' px='$5' mb='$4'>
                                <Text fontSize='$6' color='$textPrimary' fontWeight='bold'>
                                    Select address
                                </Text>
                                <XStack space='$2'>
                                    <Button onPress={handleSelectNewLocation} bg='$primary' px='$3' size='$2' borderRadius='$8' rounded>
                                        <Button.Icon>
                                            <FontAwesomeIcon icon={faPlus} color='white' />
                                        </Button.Icon>
                                        <Button.Text fontSize='$2' color='white'>
                                            New Address
                                        </Button.Text>
                                    </Button>
                                    <Button size='$2' onPress={closeBottomSheet} bg='$secondary' circular>
                                        <Button.Icon>
                                            <FontAwesomeIcon icon={faTimes} />
                                        </Button.Icon>
                                    </Button>
                                </XStack>
                            </XStack>
                            <BottomSheetFlatList
                                data={savedLocations}
                                keyExtractor={(item, index) => index}
                                showsVerticalScrollIndicator={false}
                                showsHorizontalScrollIndicator={false}
                                renderItem={({ item }) => (
                                    <YStack px='$4'>
                                        <Button
                                            onPress={() => handleLocationSelect(item)}
                                            size='$6'
                                            bg='$secondary'
                                            justifyContent='space-between'
                                            space='$1'
                                            mb='$3'
                                            px='$4'
                                            py='$3'
                                            hoverStyle={{
                                                scale: 0.9,
                                                opacity: 0.5,
                                            }}
                                            pressStyle={{
                                                scale: 0.9,
                                                opacity: 0.5,
                                            }}
                                        >
                                            <YStack>
                                                <Text mb='$1' color='$textPrimary' fontWeight='bold' numberOfLines={1}>
                                                    {item.getAttribute('name')}
                                                </Text>
                                                <Text color='$textSecondary' numberOfLines={1}>
                                                    {formattedAddressFromPlace(item)}
                                                </Text>
                                                <Text color='$textSecondary'>{formatAddressSecondaryIdentifier(item)}</Text>
                                            </YStack>
                                        </Button>
                                    </YStack>
                                )}
                            />
                            <YStack height={200} />
                        </YStack>
                    </BottomSheetView>
                </BottomSheet>
            </Portal>
        </YStack>
    );
};

export default CustomerLocationSelect;
