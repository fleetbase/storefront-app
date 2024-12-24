import React, { useEffect, useState, useRef } from 'react';
import { Animated, SafeAreaView, Pressable, FlatList, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Spinner, Avatar, Text, YStack, XStack, Separator, useTheme } from 'tamagui';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight, faPencilAlt, faTrash, faStar } from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import { formattedAddressFromPlace } from '../utils/location';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import useCurrentLocation from '../hooks/use-current-location';
import useSavedLocations from '../hooks/use-saved-locations';
import usePromiseWithLoading from '../hooks/use-promise-with-loading';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const AddressBookScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { runWithLoading, isLoading } = usePromiseWithLoading();
    const { currentLocation, updateDefaultLocationPromise } = useCurrentLocation();
    const { savedLocations, deleteLocation } = useSavedLocations();
    const rowRefs = useRef({});

    const handleEdit = (place) => {
        navigation.navigate('EditLocation', { place: place.serialize(), redirectTo: 'AddressBook' });
    };

    const handleDelete = async (place) => {
        // In case deleting place is current location get the next place and make it the default location using `handleMakeDefaultLocation`
        const isCurrentLocation = currentLocation?.id === place.id;
        const nextPlace = savedLocations.find((loc) => loc.id !== place.id);
        const placeName = place.getAttribute('name');

        try {
            await runWithLoading(deleteLocation(place), 'deleting');

            // If the deleted place was the current location and there’s another saved location, make it the default
            if (isCurrentLocation && nextPlace) {
                handleMakeDefaultLocation(nextPlace);
            }

            toast.success(`${placeName} was deleted.`);
        } catch (error) {
            console.error('Error deleting saved place: ', error);
            toast.error(error.message);
        }
    };

    const handleMakeDefaultLocation = async (place) => {
        try {
            await runWithLoading(updateDefaultLocationPromise(place), 'defaulting');
            toast.success(`${place.getAttribute('name')} is now your default location.`);
        } catch (error) {
            console.log('Error making address default location:', error);
            toast.error(error.message);
        }
    };

    const renderRightActions = (place) => (
        <XStack height='100%' width={200} minHeight={100} maxHeight={125}>
            <Pressable style={{ flex: 1 }} onPress={() => handleDelete(place)}>
                <YStack flex={1} width='100%' height='100%' bg='$error' justifyContent='center' alignItems='center' borderRadius={0}>
                    {isLoading('deleting') ? <Spinner size={40} color='white' /> : <FontAwesomeIcon icon={faTrash} size={20} color='white' />}
                </YStack>
            </Pressable>
            <Pressable style={{ flex: 1 }} onPress={() => handleEdit(place)}>
                <YStack flex={1} width='100%' height='100%' bg='$warning' justifyContent='center' alignItems='center' borderRadius={0}>
                    <FontAwesomeIcon icon={faPencilAlt} size={20} color='white' />
                </YStack>
            </Pressable>
            <Pressable style={{ flex: 1 }} onPress={() => handleMakeDefaultLocation(place)} opacity={currentLocation.id === place.id ? 0.5 : 1} disabled={currentLocation.id === place.id}>
                <YStack flex={1} width='100%' height='100%' bg='$primary' justifyContent='center' alignItems='center' borderRadius={0}>
                    {isLoading('defaulting') ? <Spinner size={40} color='white' /> : <FontAwesomeIcon icon={faStar} size={20} color='white' />}
                </YStack>
            </Pressable>
        </XStack>
    );

    const renderItem = ({ item: place, index }) => {
        const opacity = new Animated.Value(1);
        const translateX = new Animated.Value(0);
        rowRefs.current[place.id || index] = { opacity, translateX };

        return (
            <Animated.View
                style={[
                    {
                        borderBottomWidth: 1,
                        borderColor: theme.borderColor.val,
                        backgroundColor: theme.background.val,
                        opacity,
                        transform: [{ translateX }],
                    },
                ]}
            >
                <Swipeable renderRightActions={() => renderRightActions(place)}>
                    <Pressable onPress={() => handleEdit(place)} style={{ flex: 1 }}>
                        <YStack flex={1} padding='$4' bg={place.id === currentLocation?.id ? '$primary' : '$background'} minHeight={100} maxHeight={125}>
                            <Text color={place.id === currentLocation?.id ? 'white' : '$textPrimary'} fontWeight='bold' mb='$1'>
                                {place.getAttribute('name')}
                            </Text>
                            <Text color={place.id === currentLocation?.id ? 'white' : '$textSecondary'}>{formattedAddressFromPlace(place)}</Text>
                        </YStack>
                    </Pressable>
                </Swipeable>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} bg='$background' pt='$2'>
                <Animated.FlatList
                    data={savedLocations}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => item.id || index}
                    contentContainerStyle={{ paddingBottom: 16 }}
                    ItemSeparatorComponent={() => <Separator borderBottomWidth={1} borderColor='$borderColorWithShadow' />}
                />
            </YStack>
        </SafeAreaView>
    );
};

export default AddressBookScreen;
