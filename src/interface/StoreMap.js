import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { StoreLocation, Store } from '@fleetbase/storefront';
import { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import MapView, { Marker } from 'react-native-maps';
import FastImage from 'react-native-fast-image';
import { NetworkInfoService } from 'services';
import { useResourceCollection } from 'utils/Storage';
import { translate, getCurrentLocation, logError } from 'utils';
import { useLocale, useMountedState } from 'hooks';
import tailwind from 'tailwind';

const StoreMap = ({ query, location, filters, onPressStore, containerStyle, useLocationsProp, locations }) => {
    const [locale] = useLocale();
    const isMounted = useMountedState();

    const [storeLocations, setStoreLocations] = useResourceCollection('network_store_locations', StoreLocation, StorefrontAdapter, locations);
    const [userLocation, setUserLocation] = useState(location);
    const [params, setParams] = useState({
        location: userLocation?.coordinates?.join(','),
        with_store: true,
        tagged: filters,
        query,
    });

    const handleStorePress = (storeLocation) => {
        const store = new Store(storeLocation.getAttribute('store'));

        if (typeof onPressStore === 'function') {
            onPressStore(store, storeLocation);
        }
    };

    const setParam = (key, value) => {
        const _params = Object.assign({}, params);
        _params[key] = value;

        setParams(_params);

        if (!useLocationsProp) {
            NetworkInfoService.getStoreLocations(_params).then(setStoreLocations).catch(logError);
        }
    };

    useEffect(() => {
        if (!useLocationsProp) {
            // Load store locations
            NetworkInfoService.getStoreLocations(params).then(setStoreLocations).catch(logError);
        } else {
            setStoreLocations(locations);
        }

        // Set user location to state
        getCurrentLocation().then(setUserLocation).catch(logError);
    }, [isMounted]);

    useEffect(() => {
        setParam('tagged', filters);
    }, [filters]);

    useEffect(() => {
        setParam('query', query);
    }, [query]);

    return (
        <View style={tailwind('w-full h-full')}>
            {userLocation && (
                <MapView
                    minZoomLevel={12}
                    maxZoomLevel={20}
                    style={tailwind('w-full h-full rounded-md shadow-sm')}
                    initialRegion={{
                        latitude: userLocation.coordinates[0],
                        longitude: userLocation.coordinates[1],
                        latitudeDelta: 1.0922,
                        longitudeDelta: 0.0421,
                    }}
                >
                    {storeLocations.map((storeLocation, index) => (
                        <Marker
                            key={index}
                            coordinate={{ latitude: storeLocation.getAttribute('place.location.coordinates.1'), longitude: storeLocation.getAttribute('place.location.coordinates.0') }}
                            onPress={() => handleStorePress(storeLocation)}
                        >
                            <TouchableOpacity style={tailwind('flex items-center')}>
                                <View style={tailwind('flex items-center justify-center')}>
                                    <FastImage source={{ uri: storeLocation.getAttribute('store.logo_url') }} style={tailwind('h-8 w-8')} />
                                </View>
                                <View style={tailwind('px-2 py-1 rounded-md bg-gray-800 bg-opacity-75 mt-1')}>
                                    <Text style={tailwind('font-semibold text-white text-xs')}>{storeLocation.getAttribute('store.name')}</Text>
                                </View>
                            </TouchableOpacity>
                        </Marker>
                    ))}
                </MapView>
            )}
        </View>
    );
};

export default StoreMap;
