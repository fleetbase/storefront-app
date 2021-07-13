import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt, faTimes, faStar } from '@fortawesome/free-solid-svg-icons';
import { EventRegister } from 'react-native-event-listeners';
import { useResourceStorage, get, set } from '../../utils/storage';
import { getCustomer } from '../../utils/customer';
import { adapter } from '../../utils/use-fleetbase-sdk';
import { Place, GoogleAddress, Collection } from '@fleetbase/sdk';
import tailwind from '../../tailwind';

const { addEventListener, removeEventListener } = EventRegister;

const LocationPicker = (props) => {
    const [deliverTo, setDeliverTo] = useResourceStorage('deliver_to', Place, adapter);
    const [places, setPlaces] = useResourceStorage('places', Place, adapter, new Collection());
    const [isSelecting, setIsSelecting] = useState(false);
    const customer = getCustomer();
    const insets = useSafeAreaInsets();

    const loadPlaces = (initialize = false) => {
        if (customer) {
            return customer.getSavedPlaces().then((places) => {
                setPlaces(places);
            });
        }
    };

    // fn to check if deliverTo location is indeed the place
    const isDeliverTo = (place) => {
        const deliverTo = get('deliver_to');

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
        loadPlaces();

        const locationChanged = addEventListener('location.changed', (place) => {
            // if no default location set, set to location from event
            if (!deliverTo) {
                setDeliverTo(place);
            }
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
                    <FontAwesomeIcon icon={faMapMarkerAlt} style={tailwind('text-blue-900 mr-2')} />
                    <Text style={tailwind('text-blue-900 font-semibold mr-1')}>Deliver to:</Text>
                    {deliverTo ? (
                        <View style={{maxWidth: 100}}>
                            <Text style={tailwind('text-blue-900')} numberOfLines={1}>
                                {deliverTo.getAttribute('name') || deliverTo.getAttribute('street1')}
                            </Text>
                        </View>
                    ) : (
                        <ActivityIndicator color={'rgba(30, 58, 138, 1)'} />
                    )}
                </View>
            </TouchableOpacity>

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
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => {
                                        setDeliverTo(place);
                                        setIsSelecting(false);
                                    }}>
                                    <View style={tailwind(`p-4 border-b border-gray-100`)}>
                                        <View style={tailwind('flex flex-row justify-between')}>
                                            <View style={tailwind('flex-1')}>
                                                <View style={tailwind('flex flex-row items-center mb-1')}>
                                                    {isDeliverTo(place) && (
                                                        <View style={tailwind('rounded-full bg-yellow-50 w-5 h-5 flex items-center justify-center mr-1')}>
                                                            <FontAwesomeIcon size={9} icon={faStar} style={tailwind('text-yellow-900')} />
                                                        </View>
                                                    )}
                                                    <Text style={tailwind('font-semibold uppercase')}>{place.getAttribute('name')}</Text>
                                                </View>
                                                <Text style={tailwind('uppercase')}>{place.getAttribute('street1')}</Text>
                                                <Text style={tailwind('uppercase')}>{place.getAttribute('postal_code')}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default LocationPicker;
