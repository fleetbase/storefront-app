import React, { useState, useEffect, useRef, createRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt, faTimes, faStar, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { EventRegister } from 'react-native-event-listeners';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useResourceStorage, useResourceCollection, get, set } from 'utils/Storage';
import { isValidCustomer, signOut } from 'utils/Customer';
import { isResource } from 'utils';
import { adapter } from 'hooks/use-fleetbase';
import { useDeliveryLocation, useCustomer } from 'hooks';
import { Place, GoogleAddress, Collection } from '@fleetbase/sdk';
import ActionSheet from 'react-native-actions-sheet';
import Config from 'react-native-config';
import tailwind from 'tailwind';

const { GOOGLE_MAPS_KEY } = Config;
const { addEventListener, removeEventListener, emit } = EventRegister;
const actionSheetRef = createRef();
const actionSheetRef2 = createRef();

const LocationPicker = (props) => {
    const insets = useSafeAreaInsets();

    const [deliverTo, setDeliverTo] = useDeliveryLocation();
    const [customer, setCustomer] = useCustomer();
    const [places, setPlaces] = useResourceCollection('places', Place, adapter, new Collection());
    const [isSelecting, setIsSelecting] = useState(false);
    const [isEditingDeliveryLocation, setIsEditingDeliveryLocation] = useState(false);

    const loadPlaces = (customer) => {
        if (!isValidCustomer(customer)) {
            setPlaces(new Collection());
            return;
        }

        return customer
            .getSavedPlaces()
            .then((places) => {
                setPlaces(places);
            })
            .catch((error) => {
                console.log('[ Error fetching customer locations ]', error);
                signOut();
            });
    };

    const changeDeliverTo = (place) => {
        setDeliverTo(place);
        setIsSelecting(false);
    };

    const editDefaultDeliveryLocation = () => {
        // actionSheetRef2.current?.setModalVisible(false);
        // setTimeout(() => {
        //     actionSheetRef.current?.setModalVisible(true);
        // }, 600);
        setIsSelecting(false);

        setTimeout(() => {
            setIsEditingDeliveryLocation(true);
        }, 300);
    };

    const stopEditDefaultDeliveryLocation = () => {
        setIsEditingDeliveryLocation(false);

        setTimeout(() => {
            setIsSelecting(true);
        }, 300);
    };

    const setNewDefaultDeliveryLocation = (result) => {
        const googleAddress = new GoogleAddress(result);
        const place = Place.fromGoogleAddress(googleAddress);

        changeDeliverTo(place);
        stopEditDefaultDeliveryLocation();
    };

    // fn to check if deliverTo location is indeed the place
    const isDeliverTo = (place) => {
        if (deliverTo) {
            return deliverTo.id === place.id;
        }

        return false;
    };

    if (!deliverTo) {
        const location = get('location');

        if (location) {
            const googleAddress = new GoogleAddress().setAttributes(location);
            const lastKnownPlace = Place.fromGoogleAddress(googleAddress);

            if (lastKnownPlace) {
                setDeliverTo(lastKnownPlace);
            }
        }
    }

    useEffect(() => {
        loadPlaces(customer);

        const locationChanged = addEventListener('location.updated', (place) => {
            // if no default location set, set to location from event
            if (!deliverTo) {
                setDeliverTo(place);
            }
        });

        const customerUpdated = addEventListener('customer.updated', (customer) => {
            loadPlaces(customer);
        });

        const placesMutated = addEventListener('places.mutated', (place) => {
            if (!places) {
                return;
            }

            const index = places.findIndex((p) => p.id === place.id);

            if (place.isDeleted) {
                return setPlaces(places.removeAt(index));
            }

            if (index === -1) {
                return setPlaces(places.pushObject(place));
            }

            return setPlaces(places.replaceAt(index, place));
        });

        return () => {
            removeEventListener(placesMutated);
            removeEventListener(locationChanged);
        };
    }, []);

    return (
        <View style={[props.wrapperStyle || {}]}>
            <TouchableOpacity onPress={() => setIsSelecting(true)}>
                <View style={[tailwind('flex flex-row items-center rounded-full bg-blue-50 px-3 py-2'), props.wrapperStyle || {}]}>
                    {deliverTo && (
                        <View style={tailwind('flex flex-row items-center')}>
                            <FontAwesomeIcon icon={faMapMarkerAlt} style={tailwind('text-blue-900 mr-2')} />
                            <Text style={tailwind('text-blue-900 font-semibold mr-1')}>Deliver to:</Text>
                            <View style={{ maxWidth: 100 }}>
                                <Text style={tailwind('text-blue-900')} numberOfLines={1}>
                                    {deliverTo.getAttribute('name') || deliverTo.getAttribute('street1')}
                                </Text>
                            </View>
                        </View>
                    )}
                    {!deliverTo && (
                        <View style={tailwind('flex flex-row items-center')}>
                            <FontAwesomeIcon icon={faMapMarkerAlt} style={tailwind('text-blue-900 mr-2')} />
                            <Text style={tailwind('text-blue-900 font-semibold mr-1')}>Set your location</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            <Modal animationType={'slide'} transparent={true} visible={isEditingDeliveryLocation} onRequestClose={stopEditDefaultDeliveryLocation}>
                <View style={[tailwind('w-full h-full flex items-center justify-center'), { paddingTop: insets.top }]}>
                    <View style={tailwind('bg-white shadow-sm rounded-md w-full h-full')}>
                        <View style={tailwind('p-4 flex flex-row items-center justify-between bg-gray-50 rounded-t-md')}>
                            <View style={tailwind('flex flex-row items-center')}>
                                <FontAwesomeIcon icon={faMapMarkerAlt} style={tailwind('text-blue-400 mr-2')} />
                                <Text style={tailwind('text-lg font-semibold')}>Enter a new delivery location</Text>
                            </View>

                            <View>
                                <TouchableOpacity onPress={stopEditDefaultDeliveryLocation}>
                                    <View style={tailwind('rounded-full bg-red-50 w-10 h-10 flex items-center justify-center')}>
                                        <FontAwesomeIcon icon={faTimes} style={tailwind('text-red-900')} />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={tailwind('h-full')}>
                            <GooglePlacesAutocomplete
                                placeholder={'Enter address...'}
                                placeholderTextColor={'rgba(156, 163, 175, 1)'}
                                autoCapitalize={'none'}
                                autoCorrect={false}
                                currentLocation={true}
                                enableHighAccuracyLocation={true}
                                fetchDetails={true}
                                onPress={(data, details = null) => setNewDefaultDeliveryLocation(details)}
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
                </View>
            </Modal>

            {/* <ActionSheet containerStyle={tailwind('h-80')} gestureEnabled={true} bounceOnOpen={true} ref={actionSheetRef}>
                <View style={tailwind('bg-white shadow-sm rounded-md w-full h-full')}>
                    <View style={tailwind('p-4 flex flex-row items-center justify-between bg-gray-50 rounded-t-md')}>
                        <View style={tailwind('flex flex-row items-center')}>
                            <FontAwesomeIcon icon={faMapMarkerAlt} style={tailwind('text-blue-400 mr-2')} />
                            <Text style={tailwind('text-lg font-semibold')}>Enter a new delivery location</Text>
                        </View>

                        <View>
                            <TouchableOpacity onPress={stopEditDefaultDeliveryLocation}>
                                <View style={tailwind('rounded-full bg-red-50 w-10 h-10 flex items-center justify-center')}>
                                    <FontAwesomeIcon icon={faTimes} style={tailwind('text-red-900')} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={tailwind('h-full')}>
                        <GooglePlacesAutocomplete
                            placeholder={'Enter address...'}
                            placeholderTextColor={'rgba(156, 163, 175, 1)'}
                            autoCapitalize={'none'}
                            autoCorrect={false}
                            currentLocation={true}
                            enableHighAccuracyLocation={true}
                            fetchDetails={true}
                            onPress={(data, details = null) => setNewDefaultDeliveryLocation(details)}
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
            </ActionSheet>

            <ActionSheet containerStyle={[{height: 500}]} gestureEnabled={true} bounceOnOpen={true} ref={actionSheetRef2}>
                <View>
                    <View style={tailwind('p-5 flex flex-row items-center justify-between')}>
                        <View style={tailwind('flex flex-row items-center')}>
                            <FontAwesomeIcon icon={faMapMarkerAlt} style={tailwind('text-blue-400 mr-2')} />
                            <Text style={tailwind('text-lg font-semibold')}>Select your delivery location</Text>
                        </View>

                        <View>
                            <TouchableOpacity onPress={() => actionSheetRef2.current?.setModalVisible(false)}>
                                <View style={tailwind('rounded-full bg-red-50 w-10 h-10 flex items-center justify-center')}>
                                    <FontAwesomeIcon icon={faTimes} style={tailwind('text-red-900')} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView>
                        {places.map((place, index) => (
                            <TouchableOpacity key={index} onPress={() => changeDeliverTo(place)}>
                                <View style={tailwind(`p-4 border-b border-gray-100`)}>
                                    <View style={tailwind('flex flex-row justify-between')}>
                                        <View style={tailwind('flex-1')}>
                                            {isDeliverTo(place) && (
                                                <View style={tailwind('rounded-full bg-yellow-50 w-5 h-5 flex items-center justify-center mr-2')}>
                                                    <FontAwesomeIcon size={9} icon={faStar} style={tailwind('text-yellow-900')} />
                                                </View>
                                            )}
                                            <View style={tailwind('flex flex-row items-center mb-1')}>
                                                <Text style={tailwind('font-semibold uppercase')}>{place.getAttribute('name')}</Text>
                                            </View>
                                            <Text style={tailwind('uppercase')}>{place.getAttribute('street1')}</Text>
                                            <Text style={tailwind('uppercase')}>{place.getAttribute('postal_code')}</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                        {!places?.length && deliverTo instanceof Place && (
                            <TouchableOpacity onPress={editDefaultDeliveryLocation}>
                                <View style={tailwind(`p-4 border-b border-gray-100`)}>
                                    <View style={tailwind('flex flex-row items-start justify-between')}>
                                        <View style={tailwind('rounded-full bg-yellow-50 w-5 h-5 flex items-center justify-center mr-2')}>
                                            <FontAwesomeIcon size={9} icon={faStar} style={tailwind('text-yellow-900')} />
                                        </View>
                                        <View style={tailwind('flex-1')}>
                                            <View style={tailwind('flex flex-row items-center mb-1')}>
                                                <Text numberOfLines={1} style={tailwind('font-semibold uppercase')}>
                                                    {deliverTo.getAttribute('name') ?? 'Current location'}
                                                </Text>
                                            </View>
                                            <Text numberOfLines={1} style={tailwind('uppercase')}>
                                                {deliverTo.getAttribute('street1')}
                                            </Text>
                                            <Text numberOfLines={1} style={tailwind('uppercase')}>
                                                {deliverTo.getAttribute('postal_code')}
                                            </Text>
                                        </View>
                                        <View style={tailwind('h-full flex items-center flex-row')}>
                                            <View style={tailwind('flex flex-row items-center justify-center bg-blue-100 px-3 py-2 rounded-full')}>
                                                <FontAwesomeIcon size={14} icon={faExclamationCircle} style={tailwind('text-blue-700 mr-1')} />
                                                <Text style={tailwind('text-blue-900 text-xs')}>Tap to change</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                        {!deliverTo && (
                            <TouchableOpacity onPress={editDefaultDeliveryLocation}>
                                <View style={tailwind(`flex flex-row items-center px-4 py-6 bg-blue-50 border-b border-gray-100`)}>
                                    <View style={tailwind('flex flex-row')}>
                                        <FontAwesomeIcon size={16} icon={faExclamationCircle} style={tailwind('text-blue-700 mr-1')} />
                                        <Text style={tailwind('text-blue-900')}>Tap to add delivery location</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>
            </ActionSheet> */}

            <Modal animationType={'slide'} transparent={true} visible={isSelecting} onRequestClose={() => setIsSelecting(false)}>
                <View style={[tailwind('w-full h-full flex items-center justify-center'), { paddingTop: insets.top }]}>
                    <View style={tailwind('bg-white shadow-sm rounded-md w-full h-full')}>
                        <View style={tailwind('p-4 flex flex-row items-center justify-between bg-gray-50 rounded-t-md')}>
                            <View style={tailwind('flex flex-row items-center')}>
                                <FontAwesomeIcon icon={faMapMarkerAlt} style={tailwind('text-blue-400 mr-2')} />
                                <Text style={tailwind('text-lg font-semibold')}>Select your delivery location</Text>
                            </View>

                            <View>
                                <TouchableOpacity onPress={() => setIsSelecting(false)}>
                                    <View style={tailwind('rounded-full bg-red-50 w-10 h-10 flex items-center justify-center')}>
                                        <FontAwesomeIcon icon={faTimes} style={tailwind('text-red-900')} />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <ScrollView>
                            {places.map((place, index) => (
                                <TouchableOpacity key={index} onPress={() => changeDeliverTo(place)}>
                                    <View style={tailwind(`p-4 border-b border-gray-100`)}>
                                        <View style={tailwind('flex flex-row justify-between')}>
                                            <View style={tailwind('flex-1 flex flex-row')}>
                                                {isDeliverTo(place) && (
                                                    <View style={tailwind('rounded-full bg-yellow-50 w-5 h-5 flex items-center justify-center mr-2')}>
                                                        <FontAwesomeIcon size={9} icon={faStar} style={tailwind('text-yellow-900')} />
                                                    </View>
                                                )}
                                                <View style={tailwind('flex-1')}>
                                                    <View style={tailwind('flex flex-row items-center mb-1')}>
                                                        <Text style={tailwind('font-semibold uppercase')}>{place.getAttribute('name')}</Text>
                                                    </View>
                                                    <Text style={tailwind('uppercase')}>{place.getAttribute('street1')}</Text>
                                                    <Text style={tailwind('uppercase')}>{place.getAttribute('postal_code')}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                            {!places?.length && deliverTo instanceof Place && (
                                <TouchableOpacity onPress={editDefaultDeliveryLocation}>
                                    <View style={tailwind(`p-4 border-b border-gray-100`)}>
                                        <View style={tailwind('flex flex-row items-start justify-between')}>
                                            <View style={tailwind('rounded-full bg-yellow-50 w-5 h-5 flex items-center justify-center mr-2')}>
                                                <FontAwesomeIcon size={9} icon={faStar} style={tailwind('text-yellow-900')} />
                                            </View>
                                            <View style={tailwind('flex-1')}>
                                                <View style={tailwind('flex flex-row items-center mb-1')}>
                                                    <Text numberOfLines={1} style={tailwind('font-semibold uppercase')}>
                                                        {deliverTo.getAttribute('name') ?? 'Current location'}
                                                    </Text>
                                                </View>
                                                <Text numberOfLines={1} style={tailwind('uppercase')}>
                                                    {deliverTo.getAttribute('street1')}
                                                </Text>
                                                <Text numberOfLines={1} style={tailwind('uppercase')}>
                                                    {deliverTo.getAttribute('postal_code')}
                                                </Text>
                                            </View>
                                            <View style={tailwind('h-full flex items-center flex-row')}>
                                                <View style={tailwind('flex flex-row items-center justify-center bg-blue-100 px-3 py-2 rounded-full')}>
                                                    <FontAwesomeIcon size={14} icon={faExclamationCircle} style={tailwind('text-blue-700 mr-1')} />
                                                    <Text style={tailwind('text-blue-900 text-xs')}>Tap to change</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            )}
                            {!deliverTo && (
                                <TouchableOpacity onPress={editDefaultDeliveryLocation}>
                                    <View style={tailwind(`flex flex-row items-center px-4 py-6 bg-blue-50 border-b border-gray-100`)}>
                                        <View style={tailwind('flex flex-row')}>
                                            <FontAwesomeIcon size={16} icon={faExclamationCircle} style={tailwind('text-blue-700 mr-1')} />
                                            <Text style={tailwind('text-blue-900')}>Tap to add delivery location</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default LocationPicker;
