import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBuilding, faHome } from '@fortawesome/free-solid-svg-icons';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { Place } from '@fleetbase/sdk';
import { translate, config, isArray, getColorCode, logError } from 'utils';
import { useLocale } from 'hooks';
import tailwind from 'tailwind';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const CheckoutDeliveryMap = ({ info, origin, destination, wrapperStyle, containerStyle, mapHeight }) => {
    const map = useRef();
    const [locale] = useLocale();

    const [isLoadingDirections, setIsLoadingDirections] = useState(false);
    const [isDisplayingDirections, setIsDisplayDirections] = useState(false);
    const [directionsResult, setDirectionsResult] = useState(null);

    const validOrigin = (origin instanceof Place && origin.hasAttribute('location')) || (isArray(origin) && origin.length);
    const validDestination = (destination instanceof Place && destination.hasAttribute('location')) || (isArray(destination) && destination.length);

    if (!validOrigin || !validDestination) {
        return <View />;
    }

    let originPoint, destinationPoint, firstOriginPoint, finalDestinationPoint, originWaypoints, destinationWaypoints;

    if (isArray(origin)) {
        firstOriginPoint = origin.shift();

        originPoint = {
            latitude: firstOriginPoint?.getAttribute('location.coordinates.1'),
            longitude: firstOriginPoint?.getAttribute('location.coordinates.0'),
        };

        originWaypoints = origin.map((d) => ({
            latitude: d?.getAttribute('location.coordinates.1'),
            longitude: d?.getAttribute('location.coordinates.0'),
        }));
    } else {
        originPoint = {
            latitude: origin?.getAttribute('location.coordinates.1'),
            longitude: origin?.getAttribute('location.coordinates.0'),
        };

        originWaypoints = [];
    }

    if (isArray(destination)) {
        finalDestinationPoint = destination.pop();

        destinationPoint = {
            latitude: finalDestinationPoint?.getAttribute('location.coordinates.1'),
            longitude: finalDestinationPoint?.getAttribute('location.coordinates.0'),
        };

        destinationWaypoints = destination.map((d) => ({
            latitude: d?.getAttribute('location.coordinates.1'),
            longitude: d?.getAttribute('location.coordinates.0'),
        }));
    } else {
        destinationPoint = {
            latitude: destination?.getAttribute('location.coordinates.1'),
            longitude: destination?.getAttribute('location.coordinates.0'),
        };

        destinationWaypoints = [];
    }

    waypoints = [...originWaypoints, ...destinationWaypoints];

    const focus = () => {
        map?.current?.animateToRegion({
            ...destinationPoint,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
        });
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

    const onDirectionsError = (error) => {
        logError(error);
        setIsLoadingDirections(false);
    };

    return (
        <View style={[wrapperStyle]}>
            <View style={[tailwind('bg-white'), containerStyle]}>
                <MapView
                    ref={map}
                    onMapReady={focus}
                    style={[tailwind('w-full rounded-md shadow-sm'), { height: mapHeight ?? 150 }]}
                    showsUserLocation={true}
                    userLocationCalloutEnabled={true}
                    minZoomLevel={0}
                    maxZoomLevel={20}
                    initialRegion={{
                        ...destinationPoint,
                        latitudeDelta: LATITUDE_DELTA,
                        longitudeDelta: LONGITUDE_DELTA,
                    }}
                >
                    <Marker coordinate={destinationPoint}>
                        <View style={tailwind('relative')}>
                            <View
                                style={[
                                    tailwind('flex items-center justify-center w-8 h-8 border-4 border-gray-100 rounded-full bg-blue-500 absolute top-0 shadow-xl z-10 -ml-2 -mt-2'),
                                    { shadowColor: getColorCode('text-blue-400'), left: '50%', top: '50%' },
                                ]}
                            >
                                <FontAwesomeIcon icon={faHome} size={12} style={tailwind('text-white')} />
                            </View>
                        </View>
                    </Marker>

                    <Marker coordinate={originPoint}>
                        <View style={tailwind('relative')}>
                            <View
                                style={[
                                    tailwind('flex items-center justify-center w-8 h-8 border-4 border-gray-100 rounded-full bg-red-500 absolute top-0 shadow-xl z-10 -ml-2 -mt-2'),
                                    { shadowColor: getColorCode('text-red-400'), left: '50%', top: '50%' },
                                ]}
                            >
                                <FontAwesomeIcon icon={faBuilding} size={12} style={tailwind('text-white')} />
                            </View>
                        </View>
                    </Marker>

                    {waypoints?.map((waypoint, index) => (
                        <Marker key={index} coordinate={waypoint}>
                            <View style={tailwind('relative')}>
                                <View
                                    style={[
                                        tailwind('flex items-center justify-center w-8 h-8 border-4 border-gray-100 rounded-full bg-red-500 absolute top-0 shadow-xl z-10 -ml-2 -mt-2'),
                                        { shadowColor: getColorCode('text-red-400'), left: '50%', top: '50%' },
                                    ]}
                                >
                                    <FontAwesomeIcon icon={faBuilding} size={12} style={tailwind('text-white')} />
                                </View>
                            </View>
                        </Marker>
                    ))}

                    {directionsResult && (
                        <MapViewDirections
                            origin={originPoint}
                            destination={destinationPoint}
                            waypoints={waypoints}
                            onReady={onDirectionsReady}
                            onError={onDirectionsError}
                            apikey={config('GOOGLE_MAPS_KEY')}
                            strokeWidth={3}
                            strokeColor='hotpink'
                        />
                    )}
                </MapView>
            </View>
        </View>
    );
};

export default CheckoutDeliveryMap;
