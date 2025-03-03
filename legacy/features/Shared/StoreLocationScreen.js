import { Store, StoreLocation } from '@fleetbase/storefront';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useLocale, useMountedState } from 'hooks';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Linking, Text, TouchableOpacity, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tailwind from 'tailwind';
import Rating from 'ui/Rating';
import { config, getCurrentLocation, logError, translate } from 'utils';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const StoreLocationScreen = ({ navigation, route }) => {
    const { info, data, locationData } = route.params;

    const storefront = useStorefront();
    const isMounted = useMountedState();
    const insets = useSafeAreaInsets();
    const map = useRef();
    const store = new Store(data, StorefrontAdapter);

    const [locale] = useLocale();
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingDirections, setIsLoadingDirections] = useState(false);
    const [storeLocation, setStoreLocation] = useState(new StoreLocation(locationData, StorefrontAdapter));
    const [userLocation, setUserLocation] = useState(null);
    const [isDisplayingDirections, setIsDisplayDirections] = useState(false);
    const [directionsResult, setDirectionsResult] = useState(null);

    const isReviewsEnabled = info?.options?.reviews_enabled === true && config('app.storeScreenOptions.reviewsEnabled');

    const origin = {
        latitude: userLocation?.coords.latitude,
        longitude: userLocation?.coords.longitude,
    };

    const destination = {
        latitude: storeLocation?.getAttribute('place.location.coordinates.1'),
        longitude: storeLocation?.getAttribute('place.location.coordinates.0'),
    };

    const onDirectionsReady = (result) => {
        setIsLoadingDirections(false);
        setDirectionsResult(result);

        map?.current?.fitToCoordinates(result.coordinates, {
            edgePadding: {
                right: width / 20,
                bottom: height / 20,
                left: width / 20,
                top: height / 20,
            },
        });
    };

    const focusStore = () => {
        map?.current?.animateToRegion({
            latitude: storeLocation.getAttribute('place.location.coordinates.1'),
            longitude: storeLocation.getAttribute('place.location.coordinates.0'),
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
        });
    };

    const onDirectionsError = () => {
        setIsLoadingDirections(false);
    };

    const toggleDirections = () => {
        const is = !isDisplayingDirections;

        if (is === true) {
            setIsLoadingDirections(true);
        }

        if (is === false) {
            focusStore();
        }

        setIsDisplayDirections(is);
    };

    useEffect(() => {
        setIsLoading(true);

        // get users current location
        getCurrentLocation().then(setUserLocation);

        // get fresh storeLocation
        store
            .getLocation(locationData.id)
            .then(setStoreLocation)
            .catch(logError)
            .finally(() => {
                setIsLoading(false);
            });
    }, [isMounted]);

    return (
        <View>
            <View style={tailwind('bg-white h-full w-full')}>
                <View style={[tailwind('absolute w-full z-10 top-0 p-4 bg-gray-900 bg-opacity-50')]}>
                    <View style={tailwind('flex flex-row items-center')}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                            <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                                <FontAwesomeIcon icon={faTimes} />
                            </View>
                        </TouchableOpacity>
                        <View style={tailwind('flex flex-col items-start pr-10')}>
                            <Text style={tailwind('text-xl font-bold text-white')}>{store.getAttribute('name')}</Text>
                            <Text style={tailwind('text-sm font-semibold text-white')} numberOfLines={1}>
                                {storeLocation?.getAttribute('name') ?? translate('Shared.StoreLocationScreen.loading')}
                            </Text>
                        </View>
                        {isLoading && (
                            <View style={tailwind('ml-4')}>
                                <ActivityIndicator />
                            </View>
                        )}
                    </View>
                </View>
                {isLoading && (
                    <View style={tailwind('w-full h-full flex items-center justify-center')}>
                        <ActivityIndicator />
                    </View>
                )}
                {storeLocation?.isAttributeFilled('place') && (
                    <View>
                        <View style={tailwind('absolute z-20 bottom-0 w-full px-4 py-8 mt-24')}>
                            <TouchableOpacity onPress={toggleDirections} style={tailwind('btn bg-blue-500 shadow-lg border-blue-700 mb-2 flex flex-row')} disabled={isLoadingDirections}>
                                <Text style={tailwind('font-bold text-white')}>
                                    {isDisplayingDirections ? translate('Shared.StoreLocationScreen.hideDirections') : translate('Shared.StoreLocationScreen.displayDirections')}
                                </Text>
                                {isLoadingDirections && <ActivityIndicator color={'white'} style={tailwind('ml-2')} />}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={focusStore} style={tailwind('btn shadow-lg mb-2')}>
                                <Text style={tailwind('font-bold')}>{translate('Shared.StoreLocationScreen.focusOn', { storeName: store.getAttribute('name') })}</Text>
                            </TouchableOpacity>
                            {store.isAttributeFilled('phone') && (
                                <TouchableOpacity onPress={() => Linking.openURL(`tel:${store.getAttribute('phone')}`)} style={tailwind('btn shadow-lg')}>
                                    <Text style={tailwind('font-bold')}>{translate('Shared.StoreLocationScreen.call')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        {isDisplayingDirections && directionsResult && (
                            <View style={tailwind('absolute z-20 top-0 w-full px-4 py-2 mt-28')}>
                                <View style={tailwind('bg-white bg-opacity-50 rounded-md shadow-lg p-2 border border-gray-300')}>
                                    <View style={tailwind('flex flex-row bg-white bg-opacity-75 border border-gray-500 rounded-md px-2 py-2 mb-1')}>
                                        <Text style={tailwind('font-semibold w-12')}>{translate('Shared.StoreLocationScreen.from')}</Text>
                                        <Text>
                                            {userLocation.address}, {userLocation.city}
                                        </Text>
                                    </View>
                                    <View style={tailwind('flex flex-row bg-white bg-opacity-75 border border-gray-500 rounded-md px-2 py-2 mb-2')}>
                                        <Text style={tailwind('font-semibold w-12')}>{translate('Shared.StoreLocationScreen.to')}</Text>
                                        <Text>
                                            {storeLocation.getAttribute('place.street1')}, {storeLocation.getAttribute('place.city')}
                                        </Text>
                                    </View>
                                    <View style={tailwind('flex flex-row px-1')}>
                                        <View style={tailwind('flex flex-row mr-3')}>
                                            <Text style={tailwind('font-semibold mr-1')}>{translate('Shared.StoreLocationScreen.distance')}</Text>
                                            <Text>
                                                {Math.round(directionsResult.distance)} {translate('Shared.StoreLocationScreen.km')}
                                            </Text>
                                        </View>
                                        <View style={tailwind('flex flex-row')}>
                                            <Text style={tailwind('font-semibold mr-1')}>{translate('Shared.StoreLocationScreen.duration')}</Text>
                                            <Text>
                                                {Math.round(directionsResult.duration)} {translate('Shared.StoreLocationScreen.min')}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        )}
                        <MapView
                            ref={map}
                            style={tailwind('w-full h-full rounded-md shadow-sm')}
                            showsUserLocation={true}
                            userLocationCalloutEnabled={true}
                            initialRegion={{
                                latitude: storeLocation.getAttribute('place.location.coordinates.1'),
                                longitude: storeLocation.getAttribute('place.location.coordinates.0'),
                                latitudeDelta: LATITUDE_DELTA,
                                longitudeDelta: LONGITUDE_DELTA,
                            }}
                        >
                            <Marker
                                coordinate={{
                                    latitude: storeLocation.getAttribute('place.location.coordinates.1'),
                                    longitude: storeLocation.getAttribute('place.location.coordinates.0'),
                                }}
                            >
                                <View style={tailwind('relative')}>
                                    <View
                                        style={tailwind(
                                            'p-3 absolute bottom-0 left-0 mb-1.5 mr-3 rounded-md bg-white bg-opacity-75 border border-gray-400 shadow flex flex-row items-center z-30'
                                        )}
                                    >
                                        <View style={tailwind('mr-3')}>
                                            <FastImage source={{ uri: store.getAttribute('logo_url') }} style={tailwind('h-12 w-12 rounded')} />
                                        </View>
                                        <View style={tailwind('flex w-36')}>
                                            <Text style={tailwind('font-bold text-base -mt-4')} numberOfLines={1}>
                                                {store.getAttribute('name')}
                                            </Text>
                                            {store.isAttributeFilled('description') && (
                                                <Text style={tailwind('text-xs')} numberOfLines={1}>
                                                    {store.getAttribute('description')}
                                                </Text>
                                            )}
                                            {isReviewsEnabled && (
                                                <View style={tailwind('mt-1 flex flex-row items-center justify-start')}>
                                                    <Rating value={store.getAttribute('rating')} inactiveColor={'text-gray-300'} readonly={true} />
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    <View
                                        style={[
                                            tailwind('w-2 h-2 rounded-full bg-blue-500 absolute top-0 shadow-xl z-10 -ml-2 -mt-2'),
                                            { shadowColor: 'rgba(59, 130, 246, 1)', left: '50%', top: '50%' },
                                        ]}
                                    />
                                </View>
                            </Marker>
                            {isDisplayingDirections && (
                                <MapViewDirections
                                    origin={origin}
                                    destination={destination}
                                    onReady={onDirectionsReady}
                                    onError={onDirectionsError}
                                    apikey={config('GOOGLE_MAPS_API_KEY')}
                                    strokeWidth={3}
                                    strokeColor='hotpink'
                                />
                            )}
                        </MapView>
                    </View>
                )}
            </View>
        </View>
    );
};

export default StoreLocationScreen;
