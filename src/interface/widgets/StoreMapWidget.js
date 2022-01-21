import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Linking } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBuilding } from '@fortawesome/free-solid-svg-icons';
import MapView, { Marker } from 'react-native-maps';
import FastImage from 'react-native-fast-image';
import { translate, config } from 'utils';
import { useLocale } from 'hooks';
import Rating from 'ui/Rating';
import tailwind from 'tailwind';
import openMap from 'react-native-open-maps';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const StoreMapWidget = ({ info, store, storeLocation, wrapperStyle, containerStyle, mapHeight, onAddressPress }) => {
    const [locale] = useLocale();
    const map = useRef();

    mapHeight = mapHeight ?? 250;

    if (!storeLocation) {
        return <View />;
    }

    const isReviewsEnabled = info?.options?.reviews_enabled === true && config('app.storeScreenOptions.reviewsEnabled');

    const destination = {
        latitude: storeLocation?.getAttribute('place.location.coordinates.1'),
        longitude: storeLocation?.getAttribute('place.location.coordinates.0'),
    };

    const focus = () => {
        map?.current?.animateToRegion({
            ...destination,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
        });
    };

    return (
        <View style={[wrapperStyle]}>
            <View style={[tailwind('bg-white'), containerStyle]}>
                <MapView
                    ref={map}
                    onMapReady={focus}
                    style={[tailwind('w-full rounded-md shadow-sm'), { height: mapHeight }]}
                    showsUserLocation={true}
                    userLocationCalloutEnabled={true}
                    minZoomLevel={0}
                    maxZoomLevel={20}
                    initialRegion={{
                        ...destination,
                        latitudeDelta: LATITUDE_DELTA,
                        longitudeDelta: LONGITUDE_DELTA,
                    }}
                >
                    <Marker coordinate={destination}>
                        <View style={tailwind('relative')}>
                            <View
                                style={tailwind('p-3 absolute bottom-0 left-0 mb-1.5 mr-3 rounded-md bg-white bg-opacity-75 border border-gray-400 shadow flex flex-row items-center z-30')}
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
                                    tailwind('flex items-center justify-center w-8 h-8 border-4 border-gray-100 rounded-full bg-red-500 absolute top-0 shadow-xl z-10 -ml-2 -mt-2'),
                                    { shadowColor: 'rgba(220, 38, 38, 1)', left: '50%', top: '50%' },
                                ]}
                            >
                                <FontAwesomeIcon icon={faBuilding} size={12} style={tailwind('text-white')} />
                            </View>
                        </View>
                    </Marker>
                </MapView>
                <View>
                    <View style={tailwind('px-2')}>
                        <TouchableOpacity onPress={onAddressPress} style={tailwind('border-b border-gray-200 py-3 px-2')}>
                            <Text style={tailwind('text-sm text-gray-800')} numberOfLines={1}>
                                {storeLocation.getAttribute('place.address')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={tailwind('px-2')}>
                        <TouchableOpacity onPress={() => openMap(destination)} style={tailwind(`${store.hasAttribute('phone') ? 'border-b border-gray-200' : ''} py-3 px-2`)}>
                            <Text style={tailwind('text-sm text-gray-800')} numberOfLines={1}>
                                {translate('components.widgets.StoreMapWidget.getDirections')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {store.hasAttribute('phone') && (
                        <View style={tailwind('px-2')}>
                            <TouchableOpacity onPress={() => Linking.openURL(`tel:${store.getAttribute('phone')}`)} style={tailwind('py-3 px-2')}>
                                <Text style={tailwind('text-sm text-gray-800')} numberOfLines={1}>
                                    {translate('components.widgets.StoreMapWidget.call')}
                                </Text>
                                <Text style={tailwind('text-sm text-gray-500 -mt-1')} numberOfLines={1}>
                                    {store.getAttribute('phone')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

export default StoreMapWidget;
