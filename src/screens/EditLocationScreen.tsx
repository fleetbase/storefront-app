import React, { useEffect, useState, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, ScrollView } from 'react-native';
import { Spinner, Text, YStack, XStack, Button, Input, useTheme } from 'tamagui';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBuildingUser, faHouse, faBuilding, faHotel, faHospital, faSchool, faChair, faAsterisk } from '@fortawesome/free-solid-svg-icons';
import { Place } from '@fleetbase/sdk';
import { adapter } from '../hooks/use-storefront';
import { useAuth } from '../contexts/AuthContext';
import { formattedAddressFromSerializedPlace, restoreFleetbasePlace } from '../utils/location';
import { isEmpty, toBoolean } from '../utils';
import usePromiseWithLoading from '../hooks/use-promise-with-loading';
import useStorefront from '../hooks/use-storefront';
import useCurrentLocation from '../hooks/use-current-location';
import useSavedLocations from '../hooks/use-saved-locations';
import { useAppTheme } from '../hooks/use-app-theme';
import ExpandableSelect from '../components/ExpandableSelect';
import PlaceMapView from '../components/PlaceMapView';

const LocationPropertyInput = ({ value, onChange, placeholder }) => {
    return (
        <Input
            value={value}
            onChangeText={onChange}
            size='$5'
            placeholder={placeholder}
            color='$color'
            shadowOpacity={0}
            shadowRadius={0}
            borderWidth={1}
            borderColor='$borderColorWithShadow'
            borderRadius='$4'
            bg='$surface'
            autoCapitalize={false}
            autoComplete={false}
            autoCorrect={false}
        />
    );
};

const EditLocationScreen = ({ route }) => {
    const params = route.params || { redirectTo: 'AddressBook' };
    const navigation = useNavigation();
    const theme = useTheme();
    const { customer, isAuthenticated } = useAuth();
    const { storefront } = useStorefront();
    const { runWithLoading, isLoading, isAnyLoading } = usePromiseWithLoading();
    const { currentLocation, updateDefaultLocationPromise } = useCurrentLocation();
    const { savedLocations, addLocation, deleteLocation } = useSavedLocations();
    const [place, setPlace] = useState({ ...params.place });
    const [name, setName] = useState(place.name);
    const [street1, setStreet1] = useState(place.street1);
    const [street2, setStreet2] = useState(place.street2);
    const [neighborhood, setNeighborhood] = useState(place.neighborhood);
    const [city, setCity] = useState(place.city);
    const [postalCode, setPostalCode] = useState(place.postal_code);
    const [instructions, setInstructions] = useState(place.meta.instructions);
    const redirectTo = params.redirectTo;
    const redirectToScreen = params.redirectToScreen;
    const makeDefault = toBoolean(params.makeDefault);
    const isDefaultLocation = currentLocation?.id === place?.id;

    useEffect(() => {
        setPlace({
            ...place,
            name,
            street1,
        });
    }, [name, street1]);

    const handleRedirectToCheckoutScreen = () => {
        navigation.reset({
            index: 0,
            routes: [
                {
                    name: 'StoreNavigator',
                    state: {
                        index: 0,
                        routes: [
                            {
                                name: 'StoreCartTab',
                                state: {
                                    index: 1,
                                    routes: [{ name: 'Cart' }, { name: 'Checkout' }],
                                },
                            },
                        ],
                    },
                },
            ],
        });
    };

    const handleRedirect = () => {
        if (redirectTo === 'AddressBook') {
            navigation.goBack();
        } else if (redirectTo === 'Checkout') {
            handleRedirectToCheckoutScreen();
        } else {
            const reset = {
                index: 0,
                routes: [
                    {
                        name: redirectTo,
                    },
                ],
            };
            if (redirectToScreen) {
                reset.routes[0].params = { screen: redirectToScreen };
            }

            navigation.reset(reset);
        }
    };

    const getUpdatedPlace = () => {
        return { ...place, street1, street2, neighborhood, city, postal_code: postalCode, meta: { instructions } };
    };

    const handleSavePlace = async () => {
        try {
            await runWithLoading(addLocation(getUpdatedPlace(), makeDefault), 'saving');
            toast.success('Address saved.', { position: ToastPosition.bottom });
            handleRedirect();
        } catch (error) {
            console.log('Error saving address details:', error);
            toast.error(error.message, { position: ToastPosition.bottom });
        }
    };

    const handleMakeDefaultLocation = async () => {
        const restoredInstance = restoreFleetbasePlace(place);
        if (restoredInstance && restoredInstance.isSaved) {
            try {
                await runWithLoading(updateDefaultLocationPromise(restoredInstance), 'defaulting');
                toast.success(`${restoredInstance.getAttribute('name')} is now your default location.`, { position: ToastPosition.bottom });
                handleRedirect();
            } catch (error) {
                console.log('Error making address default location:', error);
                toast.error(error.message, { position: ToastPosition.bottom });
            }
        }
    };

    const handleDelete = async () => {
        const isCurrentLocation = currentLocation?.id === place.id;
        const nextPlace = savedLocations.find((loc) => loc.id !== place.id);
        const restoredInstance = restoreFleetbasePlace(place);

        if (restoredInstance && restoredInstance.isSaved) {
            try {
                await runWithLoading(deleteLocation(restoredInstance), 'deleting');
                toast.success(`${restoredInstance.getAttribute('name')} was deleted.`, { position: ToastPosition.bottom });

                // If the deleted place was the current location and there’s another saved location, make it the default
                if (isCurrentLocation && nextPlace) {
                    handleMakeDefaultLocation(nextPlace);
                }

                handleRedirect();
            } catch (error) {
                console.error('Error deleting saved address: ', error);
                toast.error(error.message, { position: ToastPosition.bottom });
            }
        }
    };

    const handleLocationSelect = () => {
        navigation.navigate('EditLocationCoord', { place: getUpdatedPlace(), redirectTo });
    };

    const handleTypeSelection = ({ type }) => {
        try {
            setPlace({ ...place, type });
        } catch (error) {
            toast.error('Unable to select location type.', { position: ToastPosition.bottom });
        }
    };

    const types = [
        { id: 1, title: 'Apartment', type: 'apartment', icon: <FontAwesomeIcon icon={faBuildingUser} color={theme.textSecondary.val} /> },
        { id: 2, title: 'House', type: 'house', icon: <FontAwesomeIcon icon={faHouse} color={theme.textSecondary.val} /> },
        { id: 3, title: 'Office', type: 'office', icon: <FontAwesomeIcon icon={faBuilding} color={theme.textSecondary.val} /> },
        { id: 4, title: 'Hotel', type: 'hotel', icon: <FontAwesomeIcon icon={faHotel} color={theme.textSecondary.val} /> },
        { id: 5, title: 'Hospital', type: 'hospital', icon: <FontAwesomeIcon icon={faHospital} color={theme.textSecondary.val} /> },
        { id: 6, title: 'School', type: 'school', icon: <FontAwesomeIcon icon={faSchool} color={theme.textSecondary.val} /> },
        { id: 7, title: 'Other', type: 'other', icon: <FontAwesomeIcon icon={faChair} color={theme.textSecondary.val} /> },
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <ScrollView showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                <YStack bg='$background' padding='$5' space='$5'>
                    <YStack space='$2'>
                        <XStack py='$1' justifyContent='space-between'>
                            <Text fontSize='$8' fontWeight='bold' color='$textPrimary' numberOfLines={1}>
                                Address
                            </Text>
                        </XStack>
                        <XStack width='100%'>
                            <Text fontSize='$6' color='$textSecondary'>
                                {formattedAddressFromSerializedPlace(place)}
                            </Text>
                        </XStack>
                    </YStack>
                    <YStack space='$2'>
                        <XStack py='$1' justifyContent='space-between'>
                            <Text fontSize='$8' fontWeight='bold' color='$textPrimary' numberOfLines={1}>
                                Location Type
                            </Text>
                        </XStack>
                        <YStack width='100%'>
                            <ExpandableSelect value={place.type} options={types} optionValue='type' onSelect={handleTypeSelection} />
                        </YStack>
                    </YStack>
                    {place.type && (
                        <YStack space='$4'>
                            <YStack py='$1' space='$2' justifyContent='space-between'>
                                <Text fontSize='$8' fontWeight='bold' color='$textPrimary' numberOfLines={1}>
                                    Address Details
                                </Text>
                                <Text fontSize='$4' color='$textSecondary' numberOfLines={1}>
                                    Add additional address details.
                                </Text>
                            </YStack>
                            <YStack space='$4'>
                                <YStack>
                                    <XStack mb='$2'>
                                        <Text fontSize='$3' fontWeight='bold' color='$textSecondary' mr='$2'>
                                            Address label or name
                                        </Text>
                                        <FontAwesomeIcon icon={faAsterisk} color={'red'} size={12} />
                                    </XStack>
                                    <LocationPropertyInput value={name} onChange={setName} placeholder='Address label or name' />
                                </YStack>
                                <YStack>
                                    <XStack mb='$2'>
                                        <Text fontSize='$3' fontWeight='bold' color='$textSecondary' mr='$2'>
                                            Street address or P.O. Box
                                        </Text>
                                        <FontAwesomeIcon icon={faAsterisk} color={'red'} size={12} />
                                    </XStack>
                                    <LocationPropertyInput value={street1} onChange={setStreet1} placeholder='Street address or P.O. Box' />
                                </YStack>
                                <YStack>
                                    <Text fontSize='$3' fontWeight='bold' color='$textSecondary' mb='$2'>
                                        Apt, suite, unit, building, floor, etc.
                                    </Text>
                                    <LocationPropertyInput value={street2} onChange={setStreet2} placeholder='Apt, suite, unit, building, floor, etc.' />
                                    <Text fontSize='$1' color='$textSecondary' mt='$2'>
                                        Optional
                                    </Text>
                                </YStack>
                                <YStack>
                                    <Text fontSize='$3' fontWeight='bold' color='$textSecondary' mb='$2'>
                                        Neighborhood
                                    </Text>
                                    <LocationPropertyInput value={neighborhood} onChange={setNeighborhood} placeholder='Neighborhood' />
                                    <Text fontSize='$1' color='$textSecondary' mt='$2' px='$2'>
                                        Optional
                                    </Text>
                                </YStack>
                                <YStack>
                                    <Text fontSize='$3' fontWeight='bold' color='$textSecondary' mb='$2'>
                                        City or town
                                    </Text>
                                    <LocationPropertyInput value={city} onChange={setCity} placeholder='City or town' />
                                    <Text fontSize='$1' color='$textSecondary' mt='$2' px='$2'>
                                        Optional
                                    </Text>
                                </YStack>
                                <YStack>
                                    <Text fontSize='$3' fontWeight='bold' color='$textSecondary' mb='$2'>
                                        Postal or zip code
                                    </Text>
                                    <LocationPropertyInput value={postalCode} onChange={setPostalCode} placeholder='Postal or zip code' />
                                    <Text fontSize='$1' color='$textSecondary' mt='$2' px='$2'>
                                        Optional
                                    </Text>
                                </YStack>
                                <YStack width='100%'>
                                    <Text fontSize='$3' fontWeight='bold' color='$textSecondary' mb='$2'>
                                        Additional instructions for the courier
                                    </Text>
                                    <LocationPropertyInput value={instructions} onChange={setInstructions} placeholder='Additional instructions for the courier' />
                                    <Text fontSize='$1' color='$textSecondary' mt='$2' px='$2'>
                                        Optional
                                    </Text>
                                </YStack>
                                <YStack>
                                    <XStack paddingVertical='$3' justifyContent='space-between'>
                                        <Text fontSize='$6' fontWeight='bold' color='$textPrimary' numberOfLines={1}>
                                            Where exactly should we meet you?
                                        </Text>
                                    </XStack>
                                    <PlaceMapView onPress={handleLocationSelect} place={place} height={140} zoom={2} />
                                </YStack>
                                <YStack width='100%' height={10} />
                                {place.id && (
                                    <YStack space='$2' mt='$4'>
                                        {!isDefaultLocation && (
                                            <Button
                                                animate='bouncy'
                                                onPress={handleMakeDefaultLocation}
                                                size='$5'
                                                bg='$blue-700'
                                                flex={1}
                                                opacity={isLoading('defaulting') || isDefaultLocation ? 0.85 : 1}
                                                disabled={isAnyLoading() || isDefaultLocation ? true : false}
                                                hoverStyle={{
                                                    scale: 0.95,
                                                    opacity: 0.5,
                                                }}
                                                pressStyle={{
                                                    scale: 0.95,
                                                    opacity: 0.5,
                                                }}
                                            >
                                                <Button.Icon>{isLoading('defaulting') && <Spinner color='$blue-100' />}</Button.Icon>
                                                <Button.Text color='$blue-100' fontWeight='bold' fontSize='$5'>
                                                    Make Default Address
                                                </Button.Text>
                                            </Button>
                                        )}
                                        <Button
                                            animate='bouncy'
                                            onPress={handleDelete}
                                            size='$5'
                                            bg='$red-700'
                                            flex={1}
                                            opacity={isLoading('deleting') ? 0.85 : 1}
                                            disabled={isAnyLoading() ? true : false}
                                            hoverStyle={{
                                                scale: 0.95,
                                                opacity: 0.5,
                                            }}
                                            pressStyle={{
                                                scale: 0.95,
                                                opacity: 0.5,
                                            }}
                                        >
                                            <Button.Icon>{isLoading('deleting') && <Spinner color='$red-100' />}</Button.Icon>
                                            <Button.Text color='$red-100' fontWeight='bold' fontSize='$5'>
                                                Delete Address
                                            </Button.Text>
                                        </Button>
                                    </YStack>
                                )}
                                <YStack width='100%' height={60} />
                            </YStack>
                        </YStack>
                    )}
                </YStack>
            </ScrollView>
            <XStack animate='bouncy' position='absolute' bottom={0} left={0} right={0} padding='$5' zIndex={5}>
                <Button
                    onPress={handleSavePlace}
                    size='$5'
                    bg='$green-600'
                    flex={1}
                    disabled={isAnyLoading() ? true : false}
                    hoverStyle={{
                        scale: 0.95,
                        opacity: 0.5,
                    }}
                    pressStyle={{
                        scale: 0.95,
                        opacity: 0.5,
                    }}
                >
                    <Button.Icon>{isLoading('saving') && <Spinner color='$green-100' />}</Button.Icon>
                    <Button.Text color='$green-100' fontWeight='bold' fontSize='$5'>
                        Save Address
                    </Button.Text>
                </Button>
            </XStack>
        </SafeAreaView>
    );
};

export default EditLocationScreen;
