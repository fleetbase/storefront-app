import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text, YStack, XStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStore, faPerson } from '@fortawesome/free-solid-svg-icons';
import { restoreFleetbasePlace, getCoordinates, makeCoordinatesFloat } from '../utils/location';
import { config, storefrontConfig } from '../utils';
import { formattedAddressFromPlace } from '../utils/location';
import MapView, { Marker, Callout } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import LocationMarker from './LocationMarker';
import LoadingOverlay from './LoadingOverlay';
import useCurrentLocation from '../hooks/use-current-location';
import useStoreLocations from '../hooks/use-store-locations';
import useStorefront from '../hooks/use-storefront';

/* Helper functions for calculating map region values */
const calculateDeltas = (zoom) => {
    const baseDelta = 0.005;
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

const getCoordinatesObject = (place) => {
    const [latitude, longitude] = getCoordinates(place);
    return { latitude, longitude };
};

const LivePickupRoute = ({ children, order, zoom = 1, width = '100%', height = '100%', mapViewProps, markerSize = 'sm' }) => {
    const theme = useTheme();
    const { storefront } = useStorefront();
    const { store } = useStoreLocations();
    const { currentLocation, isLoadingCurrentLocation } = useCurrentLocation();
    const mapRef = useRef(null);

    // Get pickup location (store location) from order
    const pickup = order.getAttribute('payload.pickup');
    const storeLocation = restoreFleetbasePlace(pickup);

    // Use current location as the origin (customer location)
    const customerLocation = currentLocation;

    // Set up coordinates
    const origin = customerLocation ? getCoordinatesObject(customerLocation) : null;
    const destination = getCoordinatesObject(storeLocation);

    const initialDeltas = calculateDeltas(zoom);
    const [mapRegion, setMapRegion] = useState({
        ...destination, // Center on store initially if no customer location
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
        if (mapRef.current) {
            mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        }
    };

    // Update map region when customer location is available
    useEffect(() => {
        if (customerLocation && origin) {
            setMapRegion({
                ...origin,
                latitudeDelta: initialDeltas,
                longitudeDelta: initialDeltas,
            });
        }
    }, [customerLocation, origin]);

    return (
        <YStack flex={1} position='relative' overflow='hidden' width={width} height={height}>
            <LoadingOverlay visible={isLoadingCurrentLocation} />
            <MapView
                ref={mapRef}
                style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }}
                initialRegion={mapRegion}
                onRegionChangeComplete={handleRegionChangeComplete}
                mapType={storefrontConfig('defaultMapType', 'standard')}
                {...mapViewProps}
            >
                {/* Customer Location Marker */}
                {origin && (
                    <Marker coordinate={makeCoordinatesFloat(origin)} centerOffset={markerOffset}>
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
                                    <FontAwesomeIcon icon={faPerson} color={theme['$gray-200'].val} size={20} />
                                </YStack>
                                <YStack flex={1} space='$1'>
                                    <Text fontWeight='bold' fontSize='$2' color='$gray-100' numberOfLines={1}>
                                        Your Location
                                    </Text>
                                    <Text fontSize='$2' color='$gray-200' numberOfLines={1}>
                                        {formattedAddressFromPlace(customerLocation)}
                                    </Text>
                                </YStack>
                            </XStack>
                        </YStack>
                        <LocationMarker size={markerSize} />
                    </Marker>
                )}

                {/* Store Location Marker */}
                <Marker coordinate={makeCoordinatesFloat(destination)} centerOffset={markerOffset}>
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
                                <FontAwesomeIcon icon={faStore} color={theme['$gray-200'].val} size={20} />
                            </YStack>
                            <YStack flex={1} space='$1'>
                                <Text fontWeight='bold' fontSize='$2' color='$gray-100' numberOfLines={1}>
                                    {storeLocation.getAttribute('name', `${store?.getAttribute('name')} Location`)}
                                </Text>
                                <Text fontSize='$2' color='$gray-200' numberOfLines={1}>
                                    {formattedAddressFromPlace(storeLocation)}
                                </Text>
                            </YStack>
                        </XStack>
                    </YStack>
                    <LocationMarker size={markerSize} />
                </Marker>

                {/* Route Directions */}
                {origin && destination && (
                    <MapViewDirections
                        origin={origin}
                        destination={destination}
                        apikey={config('GOOGLE_MAPS_API_KEY')}
                        strokeWidth={4}
                        strokeColor={theme['$blue-500'].val}
                        onReady={fitToRoute}
                    />
                )}
            </MapView>

            <YStack position='absolute' style={{ ...StyleSheet.absoluteFillObject }}>
                {children}
            </YStack>
        </YStack>
    );
};

export default LivePickupRoute;
