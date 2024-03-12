import React, { useState, useEffect, useRef, createRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Dimensions, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt, faTimes, faStar, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { EventRegister } from 'react-native-event-listeners';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useResourceStorage, useResourceCollection, get, set } from 'utils/Storage';
import { isValidCustomer, signOut } from 'utils/Customer';
import { isResource, logError, mutatePlaces, translate } from 'utils';
import { adapter } from 'hooks/use-fleetbase';
import { useDeliveryLocation, useCustomer, useMountedState, useLocale } from 'hooks';
import { Place, GoogleAddress, Collection } from '@fleetbase/sdk';
import ActionSheet from 'react-native-actions-sheet';
import Config from 'react-native-config';
import tailwind from 'tailwind';

const { GOOGLE_MAPS_KEY } = Config;
const { addEventListener, removeEventListener, emit } = EventRegister;
const actionSheetRef = createRef();
const windowHeight = Dimensions.get('window').height;
const dialogHeight = windowHeight / 2;

const LocationPicker = (props) => {
    const insets = useSafeAreaInsets();
    const isMounted = useMountedState();

    const [locale] = useLocale();
    const [deliverTo, setDeliverTo] = useDeliveryLocation();
    const [customer, setCustomer] = useCustomer();
    const [places, setPlaces] = useResourceCollection('places', Place, adapter);
    const [isAddingDeliveryLocation, setIsAddingDeliveryLocation] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const isDefaultDeliveryLocation = (place) => deliverTo?.id === place?.id;

    const loadPlaces = (customer) => {
        if (!isValidCustomer(customer)) {
            return setPlaces([]);
        }

        return customer
            .getSavedPlaces()
            .then((places) => {
                if (!isMounted()) {
                    return;
                }

                setPlaces(places);
            })
            .catch((error) => {
                console.log('[ Error fetching customer locations ]', error);
                signOut();
            });
    };

    const toggle = (open) => {
        setIsDialogOpen(open);
        // actionSheetRef.current?.setModalVisible(open);
    };

    const setNewDeliveryLocation = (result) => {
        if (!isMounted()) {
            return;
        }

        const googleAddress = new GoogleAddress(result);
        const place = Place.fromGoogleAddress(googleAddress, adapter);

        setIsAddingDeliveryLocation(false);
        setDeliverTo(place);

        if (!place?.id) {
            saveNewPlace(place);
        }
    };

    const saveNewPlace = (place) => {
        if (!customer) {
            return;
        }

        return place
            .setAttributes({
                owner: customer.id,
                name: place.getAttribute('address'),
            })
            .save()
            .then((place) => {
                emit('places.mutated', place);
            })
            .catch(logError);
    };

    const startLocationSearch = () => {
        setIsAddingDeliveryLocation(true);
    };

    const endLocationSearch = () => {
        setIsAddingDeliveryLocation(false);
    };

    const discoverDefaultLocation = () => {
        if (!deliverTo && isMounted()) {
            const location = get('location');

            if (location) {
                const googleAddress = new GoogleAddress().setAttributes(location);
                const lastKnownPlace = Place.fromGoogleAddress(googleAddress);

                if (lastKnownPlace) {
                    setDeliverTo(lastKnownPlace);
                }
            }
        }
    };

    useEffect(() => {
        loadPlaces(customer);
        discoverDefaultLocation();

        const customerUpdated = addEventListener('customer.updated', (customer) => {
            loadPlaces(customer);
        });

        const placesMutated = addEventListener('places.mutated', (place) => {
            mutatePlaces(places, place, setPlaces);
        });

        return () => {
            removeEventListener(placesMutated);
            removeEventListener(customerUpdated);
        };
    }, [isMounted]);

    const DialogHeader = ({ title, icon, onCancel }) => (
        <View style={tailwind('px-5 py-2 flex flex-row items-center justify-between mb-2')}>
            <View style={tailwind('flex flex-row items-center')}>
                <FontAwesomeIcon icon={icon} style={tailwind('text-blue-400 mr-2')} />
                <Text style={tailwind('text-lg font-semibold')}>{title}</Text>
            </View>

            <View>
                <TouchableOpacity onPress={onCancel}>
                    <View style={tailwind('rounded-full bg-red-50 w-8 h-8 flex items-center justify-center')}>
                        <FontAwesomeIcon icon={faTimes} style={tailwind('text-red-900')} />
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );

    const SearchDevliveryLocationView = () => (
        <View>
            <DialogHeader title={translate('components.interface.LocationPicker.enterDeliveryLocation')} icon={faMapMarkerAlt} onCancel={endLocationSearch} />
            <View style={tailwind('h-full')}>
                <GooglePlacesAutocomplete
                    placeholder={translate('components.interface.LocationPicker.enterAddress')}
                    placeholderTextColor={'rgba(156, 163, 175, 1)'}
                    autoCapitalize={'none'}
                    autoCorrect={true}
                    currentLocation={true}
                    enableHighAccuracyLocation={true}
                    fetchDetails={true}
                    onPress={(data, details = null) => setNewDeliveryLocation(details)}
                    query={{
                        key: GOOGLE_MAPS_KEY,
                        language: 'en',
                    }}
                    styles={{
                        textInputContainer: tailwind('w-full border-b border-gray-200 py-0 rounded-none'),
                        textInput: tailwind('h-14 text-xl font-semibold text-gray-500 my-0 rounded-none'),
                        predefinedPlacesDescription: tailwind('text-gray-600'),
                    }}
                    enablePoweredByContainer={true}
                />
            </View>
        </View>
    );

    const SelectDeliveryLocationView = () => (
        <View>
            <DialogHeader title={translate('components.interface.LocationPicker.selectDeliveryLocation')} icon={faMapMarkerAlt} onCancel={() => toggle(false)} />
            <ScrollView showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                <TouchableOpacity onPress={startLocationSearch}>
                    <View style={tailwind(`flex flex-row items-center px-4 py-6 bg-blue-50 border-b border-gray-100`)}>
                        <View style={tailwind('flex flex-row')}>
                            <FontAwesomeIcon size={16} icon={faExclamationCircle} style={tailwind('text-blue-700 mr-1')} />
                            <Text style={tailwind('text-blue-900')}>{translate('components.interface.LocationPicker.tapToAddNewDeliveryLocation')}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
                {places.map((place, index) => (
                    <TouchableOpacity key={index} onPress={() => setDeliverTo(place) && toggle(false)}>
                        <View style={tailwind(`p-4 border-b border-gray-100`)}>
                            <View style={tailwind('flex flex-row justify-between')}>
                                <View style={tailwind('flex flex-row flex-1')}>
                                    {isDefaultDeliveryLocation(place) && (
                                        <View style={tailwind('rounded-full bg-yellow-50 w-5 h-5 flex items-center justify-center mr-2')}>
                                            <FontAwesomeIcon size={9} icon={faStar} style={tailwind('text-yellow-900')} />
                                        </View>
                                    )}
                                    <View style={tailwind('flex-1')}>
                                        <View style={tailwind('flex flex-row items-center mb-1')}>
                                            <Text style={tailwind('font-semibold uppercase')}>{place.getAttribute('name')}</Text>
                                        </View>
                                        <Text style={tailwind('uppercase')}>{place.getAttribute('street1') ?? place.getAttribute('postal_code') ?? place.getAttribute('district')}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
                {!places?.length && deliverTo instanceof Place && (
                    <TouchableOpacity onPress={startLocationSearch}>
                        <View style={tailwind(`p-4 border-b border-gray-100`)}>
                            <View style={tailwind('flex flex-row items-start justify-between')}>
                                <View style={tailwind('rounded-full bg-yellow-50 w-5 h-5 flex items-center justify-center mr-2')}>
                                    <FontAwesomeIcon size={9} icon={faStar} style={tailwind('text-yellow-900')} />
                                </View>
                                <View style={tailwind('flex-1')}>
                                    <View style={tailwind('flex flex-row items-center mb-1')}>
                                        <Text numberOfLines={1} style={tailwind('font-semibold uppercase')}>
                                            {deliverTo.getAttribute('name') ?? translate('components.interface.LocationPicker.currentLocation')}
                                        </Text>
                                    </View>
                                    <Text numberOfLines={1} style={tailwind('uppercase')}>
                                        {deliverTo.getAttribute('name') ?? deliverTo.getAttribute('street1') ?? deliverTo.getAttribute('postal_code') ?? deliverTo.getAttribute('district')}
                                    </Text>
                                </View>
                                <View style={tailwind('h-full flex items-center flex-row')}>
                                    <View style={tailwind('flex flex-row items-center justify-center bg-blue-100 px-3 py-2 rounded-full')}>
                                        <FontAwesomeIcon size={14} icon={faExclamationCircle} style={tailwind('text-blue-700 mr-1')} />
                                        <Text style={tailwind('text-blue-900 text-xs')}>{translate('components.interface.LocationPicker.tapToChange')}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                {!deliverTo && (
                    <TouchableOpacity onPress={startLocationSearch}>
                        <View style={tailwind(`flex flex-row items-center px-4 py-6 bg-blue-50 border-b border-gray-100`)}>
                            <View style={tailwind('flex flex-row')}>
                                <FontAwesomeIcon size={16} icon={faExclamationCircle} style={tailwind('text-blue-700 mr-1')} />
                                <Text style={tailwind('text-blue-900')}>{translate('components.interface.LocationPicker.tapToAddDeliveryLocation')}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                <View style={tailwind('w-full flex-1 h-96')}></View>
            </ScrollView>
        </View>
    );

    return (
        <View style={[props.wrapperStyle ?? {}]}>
            <TouchableOpacity onPress={() => toggle(true)}>
                <View style={[tailwind('flex flex-row items-center rounded-full bg-blue-50 px-3 py-2'), props.buttonStyle ?? {}]}>
                    {deliverTo && (
                        <View style={tailwind('flex flex-row items-center')}>
                            <FontAwesomeIcon icon={faMapMarkerAlt} style={tailwind('text-blue-900 mr-2')} />
                            <Text style={tailwind('text-blue-900 font-semibold mr-1')}>{props.label ?? translate('components.interface.LocationPicker.deliverTo')}</Text>
                            <View style={{ maxWidth: 100 }}>
                                <Text style={tailwind('text-blue-900')} numberOfLines={1}>
                                    {deliverTo.getAttribute('name') ?? deliverTo.getAttribute('street1') ?? deliverTo.getAttribute('postal_code') ?? deliverTo.getAttribute('district')}
                                </Text>
                            </View>
                        </View>
                    )}
                    {!deliverTo && (
                        <View style={tailwind('flex flex-row items-center')}>
                            <FontAwesomeIcon icon={faMapMarkerAlt} style={tailwind('text-blue-900 mr-2')} />
                            <Text style={tailwind('text-blue-900 font-semibold mr-1')}>{translate('components.interface.LocationPicker.selectLocation')}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            <Modal animationType={'slide'} transparent={true} visible={isDialogOpen} onRequestClose={() => setIsDialogOpen(false)}>
                <View style={[tailwind('w-full h-full bg-white'), { paddingTop: Math.max(insets.top, 47) }]}>
                    {!isAddingDeliveryLocation && <SelectDeliveryLocationView />}
                    {isAddingDeliveryLocation && <SearchDevliveryLocationView />}
                </View>
            </Modal>
        </View>
    );
};

export default LocationPicker;
