import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt, faTimes } from '@fortawesome/free-solid-svg-icons';
import { EventRegister } from 'react-native-event-listeners';
import { isLastIndex } from '../../utils';
import { useResourceStorage, get, set } from '../../utils/storage';
import { getCustomer } from '../../utils/customer';
import { adapter } from '../../utils/use-fleetbase-sdk';
import { Place, GoogleAddress } from '@fleetbase/sdk';
import tailwind from '../../tailwind';

const { addEventListener, removeEventListener } = EventRegister;

const LocationPicker = (props) => {
    const [deliverTo, setDeliverTo] = useResourceStorage('deliver_to', Place, adapter);
    const [places, setPlaces] = useResourceStorage('places', Place, adapter);
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

        // Listen for places collection mutate events
        const placesMutatedListener = EventRegister.addEventListener('places.mutated', (place) => {
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
            // Remove places.mutated event listener
            EventRegister.removeEventListener(placesMutatedListener);
        };
    }, []);

    return (
        <View style={[props.wrapperStyle || {}]}>
            <TouchableOpacity onPress={() => setIsSelecting(true)}>
                <View style={[tailwind('flex flex-row items-center rounded-full bg-blue-50 flex items-center px-3 py-2'), props.wrapperStyle || {}]}>
                    <FontAwesomeIcon icon={faMapMarkerAlt} style={tailwind('text-blue-900 mr-2')} />
                    <Text style={tailwind('text-blue-900 font-semibold mr-1')}>Deliver to:</Text>
                    {deliverTo && (
                        <Text style={tailwind('text-blue-900')} numberOfLines={1}>
                            {deliverTo.getAttribute('name') || deliverTo.getAttribute('street1')}
                        </Text>
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
                                                <Text style={tailwind('font-semibold uppercase')}>{place.getAttribute('name')}</Text>
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
