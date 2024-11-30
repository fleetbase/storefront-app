import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, ScrollView } from 'react-native';
import { Spinner, Text, YStack, XStack, Button, Input, useTheme } from 'tamagui';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBuildingUser, faHouse, faBuilding, faHotel, faHospital, faSchool, faChair } from '@fortawesome/free-solid-svg-icons';
import { Place } from '@fleetbase/sdk';
import { adapter } from '../hooks/use-storefront';
import { useAuth } from '../contexts/AuthContext';
import { formattedAddressFromSerializedPlace } from '../utils/location';
import { isEmpty } from '../utils';
import usePromiseWithLoading from '../hooks/use-promise-with-loading';
import useStorefront from '../hooks/use-storefront';
import useSavedLocations from '../hooks/use-saved-locations';
import ExpandableSelect from '../components/ExpandableSelect';

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

const EditLocationScreen = ({ route }) => {
    const navigation = useNavigation();
    const theme = useTheme();
    const { customer, isAuthenticated } = useAuth();
    const { storefront } = useStorefront();
    const { runWithLoading, isLoading } = usePromiseWithLoading();
    const { addLocation } = useSavedLocations();
    const [place, setPlace] = useState({ ...route.params.place });
    const [name, setName] = useState(place.name);
    const [street1, setStreet1] = useState(place.street1);
    const [street2, setStreet2] = useState(place.street2);
    const [neighborhood, setNeighborhood] = useState(place.neighborhood);
    const [city, setCity] = useState(place.city);
    const [postalCode, setPostalCode] = useState(place.postal_code);
    const [instructions, setInstructions] = useState('');
    const ready = !isEmpty(place.type) && !isEmpty(place.name) && !isEmpty(place.street1);

    useEffect(() => {
        setPlace({
            ...place,
            name,
            street1,
        });
    }, [name, street1]);

    const handleSavePlace = async () => {
        if (!ready) {
            return;
        }

        try {
            await runWithLoading(addLocation({ ...place, street1, street2, neighborhood, city, postal_code: postalCode, meta: { instructions } }));
            toast.success('Address saved.');
            navigation.navigate('StoreHome');
        } catch (error) {
            toast.error(error.message);
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
                                    <Text fontSize='$3' fontWeight='bold' color='$textSecondary' mb='$2' px='$2'>
                                        Address label or name
                                    </Text>
                                    <LocationPropertyInput value={name} onChange={setName} placeholder='Address label or name' />
                                </YStack>
                                <YStack>
                                    <Text fontSize='$3' fontWeight='bold' color='$textSecondary' mb='$2' px='$2'>
                                        Street address or P.O. Box
                                    </Text>
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
                                <YStack width='100%' height={100} />
                            </YStack>
                        </YStack>
                    )}
                </YStack>
            </ScrollView>
            {ready && (
                <XStack bg='$surface' borderWidthTop={1} borderColor='$borderColorWithShadow' position='absolute' bottom={0} left={0} right={0} padding='$5' zIndex={5}>
                    <Button onPress={handleSavePlace} size='$5' bg='$blue-500' flex={1} opacity={ready ? 1 : 0.75}>
                        <Button.Icon>{isLoading() && <Spinner color='$blue-800' />}</Button.Icon>
                        <Button.Text color='$blue-600' fontWeight='bold' fontSize='$5'>
                            Save
                        </Button.Text>
                    </Button>
                </XStack>
            )}
        </SafeAreaView>
    );
};

export default EditLocationScreen;
