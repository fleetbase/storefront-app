import React, { useState, useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text, YStack, XStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStore, faPerson } from '@fortawesome/free-solid-svg-icons';
import { restoreFleetbasePlace, getPlaceCoords, createFauxPlace } from '../utils/location';
import { config } from '../utils';
import { formattedAddressFromPlace } from '../utils/location';
import MapView, { Marker, Callout } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import LocationMarker from './LocationMarker';
import useCurrentLocation from '../hooks/use-current-location';
import useStoreLocations from '../hooks/use-store-locations';

const calculateDeltas = (zoom) => {
    const baseDelta = 0.5;
    return baseDelta * zoom;
};

const calculateZoomLevel = (latitudeDelta) => {
    return Math.log2(360 / latitudeDelta);
};

const calculateOffset = (zoomLevel) => {
    const baseOffsetX = 50;
    const baseOffsetY = -700;
    const zoomFactor = 1 / zoomLevel;
    return {
        x: baseOffsetX * zoomFactor,
        y: baseOffsetY * zoomFactor,
    };
};

const DeliveryRoutePreview = ({ children, zoom = 1, width = '100%', height = '100%', mapViewProps, markerSize = 'sm' }) => {
    const theme = useTheme();
    const { store, currentStoreLocation } = useStoreLocations();
    const { currentLocation } = useCurrentLocation();
    const mapRef = useRef(null);
    const start = currentStoreLocation === undefined ? createFauxPlace() : restoreFleetbasePlace(currentStoreLocation.getAttribute('place'));
    const end = restoreFleetbasePlace(currentLocation);
    const origin = getPlaceCoords(start);
    const destination = getPlaceCoords(end);
    const initialDeltas = calculateDeltas(zoom);
    const [mapRegion, setMapRegion] = useState({
        ...origin,
        latitudeDelta: initialDeltas,
        longitudeDelta: initialDeltas,
    });
    const [zoomLevel, setZoomLevel] = useState(calculateZoomLevel(initialDeltas));
    const markerOffset = calculateOffset(zoomLevel);

    const handleRegionChangeComplete = (region) => {
        setMapRegion(region);
        const newZoomLevel = calculateZoomLevel(region.latitudeDelta);
        setZoomLevel(newZoomLevel);
    };

    const fitToRoute = ({ coordinates }) => {
        mapRef.current?.fitToCoordinates(coordinates, {
            edgePadding: { top: 200, right: 100, bottom: 125, left: 100 },
            animated: true,
        });
    };

    return (
        <YStack flex={1} position='relative' overflow='hidden' width={width} height={height}>
            <MapView
                ref={mapRef}
                style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }}
                initialRegion={mapRegion}
                onRegionChangeComplete={handleRegionChangeComplete}
                {...mapViewProps}
            >
                <Marker coordinate={origin} centerOffset={markerOffset}>
                    <YStack
                        mb={8}
                        px='$3'
                        py='$2'
                        bg='$gray-900'
                        borderRadius='$4'
                        space='$1'
                        shadowColor='$shadowColor'
                        shadowOffset={markerOffset}
                        shadowOpacity={0.25}
                        shadowRadius={3}
                        width={180}
                    >
                        <XStack space='$2'>
                            <YStack justifyContent='center'>
                                <FontAwesomeIcon icon={faStore} color={theme['$gray-200'].val} size={20} />
                            </YStack>
                            <YStack flex={1} space='$1'>
                                <Text fontWeight='bold' fontSize='$2' color='$gray-100' numberOfLines={1}>
                                    {start.getAttribute('name', `${store.getAttribute('name')} Location`)}
                                </Text>
                                <Text fontSize='$2' color='$gray-200' numberOfLines={1}>
                                    {formattedAddressFromPlace(start)}
                                </Text>
                            </YStack>
                        </XStack>
                    </YStack>
                    <LocationMarker size={markerSize} />
                </Marker>
                <Marker coordinate={destination} centerOffset={markerOffset}>
                    <YStack
                        mb={8}
                        px='$3'
                        py='$2'
                        bg='$gray-900'
                        borderRadius='$4'
                        space='$1'
                        shadowColor='$shadowColor'
                        shadowOffset={{ width: 0, height: 5 }}
                        shadowOpacity={0.25}
                        shadowRadius={3}
                        width={180}
                    >
                        <XStack space='$2'>
                            <YStack justifyContent='center'>
                                <FontAwesomeIcon icon={faPerson} color={theme['$gray-200'].val} size={20} />
                            </YStack>
                            <YStack flex={1} space='$1'>
                                <Text fontWeight='bold' fontSize='$2' color='$gray-100' numberOfLines={1}>
                                    {end.getAttribute('name') ?? 'Your Location'}
                                </Text>
                                <Text fontSize='$2' color='$gray-200' numberOfLines={1}>
                                    {formattedAddressFromPlace(end)}
                                </Text>
                            </YStack>
                        </XStack>
                    </YStack>
                    <LocationMarker size={markerSize} />
                </Marker>

                <MapViewDirections origin={origin} destination={destination} apikey={config('GOOGLE_MAPS_KEY')} strokeWidth={4} strokeColor={theme['$blue-500'].val} onReady={fitToRoute} />
            </MapView>

            <YStack position='absolute' style={{ ...StyleSheet.absoluteFillObject }}>
                {children}
            </YStack>
        </YStack>
    );
};

export default DeliveryRoutePreview;
