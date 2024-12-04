import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Animated, SafeAreaView, TouchableOpacity, FlatList, Pressable, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Spinner, Button, Text, YStack, XStack, Separator, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight, faTimes } from '@fortawesome/free-solid-svg-icons';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { useNavigation } from '@react-navigation/native';
import BottomSheet, { BottomSheetView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Portal } from '@gorhom/portal';
import { formattedAddressFromPlace, formatAddressSecondaryIdentifier } from '../../utils/location';
import useCurrentLocation from '../../hooks/use-current-location';
import useSavedLocations from '../../hooks/use-saved-locations';
import PlaceMapView from '../PlaceMapView';

const SelectDropoffLocation = ({ onChange, ...props }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { currentLocation, updateDefaultLocation } = useCurrentLocation();
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
        try {
            await updateDefaultLocation(place);
            closeBottomSheet();

            if (typeof onChange === 'function') {
                onChange(place);
            }
        } catch (error) {
            console.error('Error updating dropoff location at checkout:', error);
            toast.error(error.message);
        }
    };

    const handleChangeLocation = () => {
        openBottomSheet();
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
                    style={{ flex: 1, padding: 10, width: '100%' }}
                >
                    <BottomSheetView style={{ flex: 1 }}>
                        <YStack>
                            <YStack alignItems='flex-end'>
                                <Button size='$3' onPress={closeBottomSheet} bg='$gray-300' circular>
                                    <Button.Icon>
                                        <FontAwesomeIcon icon={faTimes} />
                                    </Button.Icon>
                                </Button>
                            </YStack>
                            <BottomSheetFlatList
                                data={savedLocations}
                                keyExtractor={(item, index) => index}
                                renderItem={({ item }) => (
                                    <Button
                                        onPress={() => handleLocationSelect(item)}
                                        size='$4'
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
                                            <Text color='$textPrimary' fontWeight='bold' numberOfLines={1}>
                                                {formattedAddressFromPlace(item)}
                                            </Text>
                                            <Text color='$textSecondary'>{formatAddressSecondaryIdentifier(item)}</Text>
                                        </YStack>
                                    </Button>
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

export default SelectDropoffLocation;
