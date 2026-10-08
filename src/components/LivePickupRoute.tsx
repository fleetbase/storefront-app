import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text, YStack, XStack, useTheme } from 'tamagui';
import { restoreFleetbasePlace, getCoordinates, makeCoordinatesFloat } from '../utils/location';
import { config, storefrontConfig } from '../utils';
import MapView from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { PlaceMapMarker, StoreMapMarker } from './map/RouteMarkers';
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
                {/* The customer */}
                {origin && <PlaceMapMarker coordinate={makeCoordinatesFloat(origin)} kind='person' />}

                {/* The store to pick up from */}
                <StoreMapMarker coordinate={makeCoordinatesFloat(destination)} name={store?.getAttribute('name') ?? storeLocation.getAttribute('name')} />

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
