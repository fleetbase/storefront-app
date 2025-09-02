import React, { useState, useEffect, createRef, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { StoreLocation, Store } from '@fleetbase/storefront';
import { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import Carousel, { Pagination } from 'react-native-snap-carousel';
import MapView, { Marker } from 'react-native-maps';
import FastImage from 'react-native-fast-image';
import { NetworkInfoService } from 'services';
import { useResourceCollection } from 'utils/Storage';
import { translate, getCurrentLocation, logError, isArray } from 'utils';
import { useLocale, useMountedState } from 'hooks';
import Rating from 'ui/Rating';
import tailwind from 'tailwind';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const carouselItemWidth = 265;
const carouselItemHeight = 170;

const StoreMap = ({ query, location, filters, onPressStore, containerStyle, mapViewStyle, useLocationsProp, locations, useCarousel, isReviewsEnabled }) => {
    const [locale] = useLocale();
    const isMounted = useMountedState();
    const carouselRef = useRef();
    const map = useRef();

    const [storeLocations, setStoreLocations] = useResourceCollection('network_store_locations', StoreLocation, StorefrontAdapter, locations);
    const [userLocation, setUserLocation] = useState(location);
    const [focusedLocationIndex, setFocusedLocationIndex] = useState(0);
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

    const focusStoreLocation = (index = 0) => {
        setFocusedLocationIndex(index);

        const count = index + 1;

        if (!isArray(storeLocations)) {
            return;
        }

        if (storeLocations.length < count) {
            return;
        }

        const storeLocation = storeLocations.objectAt(index);
        const destination = {
            latitude: storeLocation?.getAttribute('place.location.coordinates.1') - 0.0005,
            longitude: storeLocation?.getAttribute('place.location.coordinates.0'),
        };
        const latitudeZoom = 30;
        const longitudeZoom = 30;
        const latitudeDelta = LATITUDE_DELTA / latitudeZoom;
        const longitudeDelta = LONGITUDE_DELTA / longitudeZoom;

        if (destination?.latitude === NaN || destination?.longitude === NaN) {
            return focusStoreLocation(index++);
        }

        map?.current?.animateToRegion({
            ...destination,
            latitudeDelta,
            longitudeDelta,
        });
    };

    const renderLocation = ({ item, index }) => {
        return (
            <View key={index} style={[tailwind('flex flex-row bg-gray-100 border border-gray-300 rounded-lg shadow-sm'), { width: carouselItemWidth, height: carouselItemHeight }]}>
                <View style={tailwind('p-4')}>
                    <View style={tailwind('flex flex-row')}>
                        <View style={tailwind('mr-4')}>
                            <FastImage source={{ uri: item.getAttribute('store.logo_url') }} style={tailwind('h-18 w-18')} />
                        </View>
                        <View style={tailwind('py-2')}>
                            <View style={tailwind('flex-row w-36')}>
                                <Text style={tailwind('flex-1 flex-wrap font-bold text-black')} numberOfLines={1}>
                                    {item.getAttribute('store.name')}
                                </Text>
                            </View>
                            {item.isAttributeFilled('store.description') && (
                                <Text style={tailwind('flex flex-wrap text-gray-700 text-sm mt-1')} numberOfLines={4}>
                                    {item.getAttribute('store.description')}
                                </Text>
                            )}
                            {isReviewsEnabled && (
                                <View style={tailwind('mt-2')}>
                                    <Rating value={item.getAttribute('store.rating')} inactiveColor={'text-gray-300'} readonly={true} />
                                </View>
                            )}
                        </View>
                    </View>
                    <View style={tailwind('py-2 flex-row w-60')}>
                        <Text style={tailwind('flex-1 flex-wrap text-gray-700 text-sm')} numberOfLines={2}>
                            {item.getAttribute('place.address')}
                        </Text>
                    </View>
                </View>
            </View>
        );
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
        // when store locations count changes focus
        // should only be after initial load
        focusStoreLocation();
    }, [JSON.stringify(storeLocations)]);

    useEffect(() => {
        setParam('tagged', filters);
    }, [filters]);

    useEffect(() => {
        setParam('query', query);
    }, [query]);

    return (
        <View style={tailwind('w-full h-full relative')}>
            {userLocation && (
                <MapView
                    ref={map}
                    onMapReady={() => focusStoreLocation(focusedLocationIndex)}
                    showsUserLocation={true}
                    userLocationCalloutEnabled={true}
                    showsMyLocationButton={true}
                    showsPointsOfInterest={true}
                    showsTraffic={true}
                    style={[tailwind('w-full h-full rounded-md shadow-sm z-10'), mapViewStyle]}
                    initialRegion={{
                        latitude: userLocation.coords.latitude,
                        longitude: userLocation.coords.longitude,
                        latitudeDelta: LATITUDE_DELTA,
                        longitudeDelta: LONGITUDE_DELTA,
                    }}
                >
                    {storeLocations.map((storeLocation, index) => (
                        <Marker
                            key={index}
                            coordinate={{ latitude: storeLocation.getAttribute('place.location.coordinates.1'), longitude: storeLocation.getAttribute('place.location.coordinates.0') }}
                            onPress={() => handleStorePress(storeLocation)}
                            style={tailwind(`${focusedLocationIndex === index ? 'z-30' : 'z-10'}`)}
                        >
                            <TouchableOpacity style={tailwind('flex items-center')}>
                                <View style={tailwind('flex items-center justify-center')}>
                                    <FastImage source={{ uri: storeLocation.getAttribute('store.logo_url') }} style={tailwind('h-8 w-8')} />
                                </View>
                                <View style={tailwind('flex items-center justify-center px-2 py-1 rounded-md bg-gray-800 bg-opacity-75 mt-1')}>
                                    <Text style={tailwind('font-semibold text-white text-xs')}>{storeLocation.getAttribute('store.name')}</Text>
                                    {isReviewsEnabled && (
                                        <View style={tailwind('mt-1 flex flex-row items-center justify-start')}>
                                            <Rating value={storeLocation.getAttribute('store.rating')} inactiveColor={'text-gray-300'} readonly={true} />
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </Marker>
                    ))}
                </MapView>
            )}
            {useCarousel === true && (
                <View style={tailwind('z-20 absolute bottom-0 left-0 right-0 w-full mb-40')}>
                    <Carousel
                        ref={carouselRef}
                        layout={'default'}
                        data={storeLocations}
                        renderItem={renderLocation}
                        sliderWidth={width}
                        itemWidth={carouselItemWidth}
                        onSnapToItem={focusStoreLocation}
                        firstItem={focusedLocationIndex}
                        enableMomentum={true}
                    />
                </View>
            )}
        </View>
    );
};

export default StoreMap;
