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
import { isEmpty } from '../utils';
import usePromiseWithLoading from '../hooks/use-promise-with-loading';
import useStorefront from '../hooks/use-storefront';
import useCurrentLocation from '../hooks/use-current-location';
import useSavedLocations from '../hooks/use-saved-locations';
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
            bg='white'
            autoCapitalize={false}
            autoComplete={false}
            autoCorrect={false}
        />
    );
};

const EditLocationScreen = ({ route = { params: {} } }) => {
    const navigation = useNavigation();
    const theme = useTheme();
    const { params } = route;
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
    const redirectTo = route.params.redirectTo ?? 'StoreHome';
    const isDefaultLocation = currentLocation?.id === place?.id;

    const isReady = useMemo(() => {
        if (isEmpty(place.id)) {
            return !isEmpty(place.type) && !isEmpty(place.name) && !isEmpty(place.street1);
        }

        return (
            name !== place.name ||
            street1 !== place.street1 ||
            street2 !== place.street2 ||
            neighborhood !== place.neighborhood ||
            city !== place.city ||
            postalCode !== place.postal_code ||
            instructions !== place.meta?.instructions
        );
    }, [place.type, name, street1, street2, neighborhood, city, postalCode, instructions]);

    useEffect(() => {
        setPlace({
            ...place,
            name,
            street1,
        });
    }, [name, street1]);

    const handleRedirect = () => {
        navigation.reset({
            index: 0,
            routes: [
                {
                    name: redirectTo,
                },
            ],
        });
    };

    const handleSavePlace = async () => {
        if (!isReady) {
            return;
        }

        try {
            await runWithLoading(addLocation({ ...place, street1, street2, neighborhood, city, postal_code: postalCode, meta: { instructions } }), 'saving');
            toast.success('Address saved.');
            handleRedirect();
        } catch (error) {
            console.log('Error saving address details:', error);
            toast.error(error.message);
        }
    };

    const handleMakeDefaultLocation = async () => {
        const restoredInstance = restoreFleetbasePlace(place);
        if (restoredInstance && restoredInstance.isSaved) {
            try {
                await runWithLoading(updateDefaultLocationPromise(restoredInstance), 'defaulting');
                toast.success(`${restoredInstance.getAttribute('name')} is now your default location.`);
                handleRedirect();
            } catch (error) {
                console.log('Error making address default location:', error);
                toast.error(error.message);
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
                toast.success(`${restoredInstance.getAttribute('name')} was deleted.`);

                // If the deleted place was the current location and there’s another saved location, make it the default
                if (isCurrentLocation && nextPlace) {
                    handleMakeDefaultLocation(nextPlace);
                }

                handleRedirect();
            } catch (error) {
                console.error('Error deleting saved address: ', error);
                toast.error(error.message);
            }
        }
    };

    const handleTypeSelection = ({ type }) => {
        try {
            setPlace({ ...place, type });
        } catch (error) {
            toast.error('Unable to select location type.');
        }
    };

    const types = [
        { id: 1, title: 'Apartment', type: 'apartment', icon: <FontAwesomeIcon icon={faBuildingUser} /> },
        { id: 2, title: 'House', type: 'house', icon: <FontAwesomeIcon icon={faHouse} /> },
        { id: 3, title: 'Office', type: 'office', icon: <FontAwesomeIcon icon={faBuilding} /> },
        { id: 4, title: 'Hotel', type: 'hotel', icon: <FontAwesomeIcon icon={faHotel} /> },
        { id: 5, title: 'Hospital', type: 'hospital', icon: <FontAwesomeIcon icon={faHospital} /> },
        { id: 6, title: 'School', type: 'school', icon: <FontAwesomeIcon icon={faSchool} /> },
        { id: 7, title: 'Other', type: 'other', icon: <FontAwesomeIcon icon={faChair} /> },
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <ScrollView showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                <YStack bg='$background' padding='$5' space='$2'>
                    <YStack space='$2'>
                        <XStack paddingVertical='$3' justifyContent='space-between'>
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
                        <XStack paddingVertical='$3' justifyContent='space-between'>
                            <Text fontSize='$8' fontWeight='bold' color='$textPrimary' numberOfLines={1}>
                                Location Type
                            </Text>
                        </XStack>
                        <YStack width='100%'>
                            <ExpandableSelect value={place.type} options={types} optionValue='type' onSelect={handleTypeSelection} />
                        </YStack>
                    </YStack>
                    {place.type && (
                        <YStack space='$2'>
                            <YStack paddingVertical='$3' justifyContent='space-between'>
                                <Text fontSize='$8' fontWeight='bold' color='$textPrimary' numberOfLines={1}>
                                    Address Details
                                </Text>
                                <Text fontSize='$4' color='$textSecondary' mt='$3' numberOfLines={1}>
                                    Add additional address details.
                                </Text>
                            </YStack>
                            <YStack space='$3'>
                                <YStack>
                                    <XStack>
                                        <Text fontSize='$3' fontWeight='bold' color='$textSecondary' mb='$2' pl='$2' pr='$1'>
                                            Address label or name
                                        </Text>
                                        <FontAwesomeIcon icon={faAsterisk} color={'red'} size={12} />
                                    </XStack>
                                    <LocationPropertyInput value={name} onChange={setName} placeholder='Address label or name' />
                                </YStack>
                                <YStack>
                                    <XStack>
                                        <Text fontSize='$3' fontWeight='bold' color='$textSecondary' mb='$2' pl='$2' pr='$1'>
                                            Street address or P.O. Box
                                        </Text>
                                        <FontAwesomeIcon icon={faAsterisk} color={'red'} size={12} />
                                    </XStack>
                                    <LocationPropertyInput value={street1} onChange={setStreet1} placeholder='Street address or P.O. Box' />
                                </YStack>
                                <YStack>
                                    <Text fontSize='$3' fontWeight='bold' color='$textSecondary' mb='$2' px='$2'>
                                        Apt, suite, unit, building, floor, etc.
                                    </Text>
                                    <LocationPropertyInput value={street2} onChange={setStreet2} placeholder='Apt, suite, unit, building, floor, etc.' />
                                    <Text fontSize='$1' color='$textSecondary' mt='$2' px='$2'>
                                        Optional
                                    </Text>
                                </YStack>
                                <YStack>
                                    <Text fontSize='$3' fontWeight='bold' color='$textSecondary' mb='$2' px='$2'>
                                        Neighborhood
                                    </Text>
                                    <LocationPropertyInput value={neighborhood} onChange={setNeighborhood} placeholder='Neighborhood' />
                                    <Text fontSize='$1' color='$textSecondary' mt='$2' px='$2'>
                                        Optional
                                    </Text>
                                </YStack>
                                <YStack>
                                    <Text fontSize='$3' fontWeight='bold' color='$textSecondary' mb='$2' px='$2'>
                                        City or town
                                    </Text>
                                    <LocationPropertyInput value={city} onChange={setCity} placeholder='City or town' />
                                    <Text fontSize='$1' color='$textSecondary' mt='$2' px='$2'>
                                        Optional
                                    </Text>
                                </YStack>
                                <YStack>
                                    <Text fontSize='$3' fontWeight='bold' color='$textSecondary' mb='$2' px='$2'>
                                        Postal or zip code
                                    </Text>
                                    <LocationPropertyInput value={postalCode} onChange={setPostalCode} placeholder='Postal or zip code' />
                                    <Text fontSize='$1' color='$textSecondary' mt='$2' px='$2'>
                                        Optional
                                    </Text>
                                </YStack>
                                <YStack width='100%'>
                                    <Text fontSize='$3' fontWeight='bold' color='$textSecondary' mb='$2' px='$2'>
                                        Additional instructions for the courier
                                    </Text>
                                    <LocationPropertyInput value={instructions} onChange={setInstructions} placeholder='Additional instructions for the courier' />
                                    <Text fontSize='$1' color='$textSecondary' mt='$2' px='$2'>
                                        Optional
                                    </Text>
                                </YStack>
                                <YStack>
                                    <XStack paddingVertical='$3' justifyContent='space-between'>
                                        <Text fontSize='$8' fontWeight='bold' color='$textPrimary' numberOfLines={1}>
                                            Where exactly is the location?
                                        </Text>
                                    </XStack>
                                    <PlaceMapView place={place} height={150} />
                                </YStack>
                                <YStack width='100%' height={25} />
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
                                <YStack width='100%' height={isReady ? 100 : 10} />
                            </YStack>
                        </YStack>
                    )}
                </YStack>
            </ScrollView>
            {isReady && (
                <XStack animate='bouncy' bg='$surface' borderWidth={1} borderTopColor='$borderColorWithShadow' position='absolute' bottom={0} left={0} right={0} padding='$5' zIndex={5}>
                    <Button
                        onPress={handleSavePlace}
                        size='$5'
                        bg='$blue-700'
                        flex={1}
                        opacity={isReady ? 1 : 0.85}
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
                        <Button.Icon>{isLoading('saving') && <Spinner color='$blue-100' />}</Button.Icon>
                        <Button.Text color='$blue-100' fontWeight='bold' fontSize='$5'>
                            Save
                        </Button.Text>
                    </Button>
                </XStack>
            )}
        </SafeAreaView>
    );
};

export default EditLocationScreen;
