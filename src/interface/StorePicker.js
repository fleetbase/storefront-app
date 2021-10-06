import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt, faTimes, faInfoCircle, faStar } from '@fortawesome/free-solid-svg-icons';
import { EventRegister } from 'react-native-event-listeners';
import { haversine } from 'utils';
import { useResourceStorage, get, set } from 'utils/Storage';
import { adapter as FleetbaseAdapter } from 'hooks/use-fleetbase';
import { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { Place, GoogleAddress } from '@fleetbase/sdk';
import { Store, StoreLocation } from '@fleetbase/storefront';
import tailwind from 'tailwind';

const { addEventListener, removeEventListener } = EventRegister;
const { isArray } = Array;

const StorePicker = (props) => {
    const [deliverTo, setDeliverTo] = useResourceStorage('deliver_to', Place, FleetbaseAdapter);
    const [storeLocation, setStoreLocation] = useResourceStorage('store_location', StoreLocation, StorefrontAdapter);
    const [storeLocations, setStoreLocations] = useResourceStorage('locations', StoreLocation, StorefrontAdapter, []);
    const [isSelecting, setIsSelecting] = useState(false);
    const { info } = props;
    const store = new Store(info, StorefrontAdapter);
    const insets = useSafeAreaInsets();

    const loadLocations = (initialize = false) => {
        if (!store || !store instanceof Store) {
            return;
        }

        return store.getLocations().then((locations) => {
            setStoreLocations(locations);
        }).catch((error) => {
            console.log('[Error fetching store locations]', error);
        });
    };

    const selectStoreLocation = (selectedStoreLocation) => {
        if (!storeLocation && selectedStoreLocation === undefined) {
            const defaultStoreLocation = storeLocations.first;

            if (defaultStoreLocation) {
                setStoreLocation(defaultStoreLocation);
            }
        }

        if (selectedStoreLocation instanceof StoreLocation) {
            setStoreLocation(selectedStoreLocation);
        }
    };

    const getCoordinates = (location) => {
        if (!location) {
            return [];
        }

        if (location instanceof Place) {
            return location.coordinates;
        }

        if (location instanceof StoreLocation) {
            const point = location.getAttribute('place.location');

            if (!point) {
                return [0, 0];
            }

            const [ longitude, latitude ] = point.coordinates;
            const coordinates = [ latitude, longitude ];

            return coordinates;
        }

        if (isArray(location)) {
            return location;
        }

        if (typeof location === 'object' && location?.type === 'Point') {
            const [ longitude, latitude ] = location.coordinates;
            const coordinates = [ latitude, longitude ];

            return coordinates;
        }
    }

    const getDistance = (origin, destination) => {
        const originCoordinates = getCoordinates(origin);
        const destinationCoordinates = getCoordinates(destination);

        return haversine(originCoordinates, destinationCoordinates);
    }

    const isCurrentStoreLocation = (idxStoreLocation) => idxStoreLocation.id === storeLocation?.id;

    const formatKm = (km) => `${Math.round(km)}km`;

    useEffect(() => {
        loadLocations();
        selectStoreLocation();
    }, []);

    return (
        <View style={[props.wrapperStyle || {}]}>
            <TouchableOpacity onPress={() => setIsSelecting(true)}>
                <View style={[tailwind('flex flex-row items-center rounded-full bg-gray-900 px-3 py-2 '), props.wrapperStyle || {}]}>
                    <FontAwesomeIcon icon={faInfoCircle} style={tailwind('text-white mr-2')} />
                    <View style={{maxWidth: 100}}>
                        <Text style={tailwind('text-white')} numberOfLines={1}>{props.info.name}</Text>
                    </View>
                </View>
            </TouchableOpacity>

            <Modal animationType={'slide'} transparent={true} visible={isSelecting} onRequestClose={() => setIsSelecting(false)}>
                <View style={[tailwind('w-full h-full flex items-center justify-center'), { paddingTop: insets.top }]}>
                    <View style={tailwind('bg-white shadow-sm rounded-md w-full h-full')}>
                        <View style={tailwind('p-4 flex flex-row items-start justify-between bg-gray-50 rounded-t-md')}>
                            <View style={tailwind('flex flex-row items-start')}>
                                <FontAwesomeIcon icon={faMapMarkerAlt} style={tailwind('text-blue-400 mt-2 mr-2')} />
                                <View>
                                    <Text style={tailwind('text-lg font-semibold')}>{info.name}</Text>
                                    <Text style={tailwind('text-sm text-gray-700 font-semibold')}>Location and Hours</Text>
                                </View>
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
                            {storeLocations.map((storeLocation, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => {
                                        selectStoreLocation(storeLocation);
                                        setIsSelecting(false);
                                    }}>
                                    <View style={tailwind(`p-4 border-b border-gray-100`)}>
                                        <View style={tailwind('flex flex-row justify-between')}>
                                            <View style={tailwind('flex-1')}>
                                                <View style={tailwind('flex flex-row items-center')}>
                                                    {isCurrentStoreLocation(storeLocation) && (
                                                        <View style={tailwind('rounded-full bg-yellow-50 w-5 h-5 flex items-center justify-center mr-2')}>
                                                            <FontAwesomeIcon size={9} icon={faStar} style={tailwind('text-yellow-900')} />
                                                        </View>
                                                    )}
                                                    <View>
                                                        <Text style={tailwind('font-semibold uppercase')}>{storeLocation.getAttribute('name')}</Text>
                                                        <Text style={tailwind('uppercase')}>{storeLocation.getAttribute('place.street1')}</Text>
                                                        <Text style={tailwind('uppercase')}>{storeLocation.getAttribute('place.postal_code')}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <View>
                                                {deliverTo && <Text>{formatKm(getDistance(storeLocation, deliverTo))}</Text>}
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

export default StorePicker;
