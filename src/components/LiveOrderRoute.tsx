import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text, YStack, XStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStore, faPerson } from '@fortawesome/free-solid-svg-icons';
import { Driver, Vehicle } from '@fleetbase/sdk';
import { FoodTruck } from '@fleetbase/storefront';
import { restoreFleetbasePlace, getCoordinates, makeCoordinatesFloat } from '../utils/location';
import { config, storefrontConfig, getFoodTruckById, isArray } from '../utils';
import { formattedAddressFromPlace } from '../utils/location';
import MapView, { Marker, Callout } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import LocationMarker from './LocationMarker';
import DriverMarker from './DriverMarker';
import VehicleMarker from './VehicleMarker';
import LoadingOverlay from './LoadingOverlay';
import useCurrentLocation from '../hooks/use-current-location';
import useStoreLocations from '../hooks/use-store-locations';
import useStorefront from '../hooks/use-storefront';
import { adapter as fleetbaseAdapter } from '../hooks/use-fleetbase';

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

const LiveOrderRoute = ({ children, order, zoom = 1, width = '100%', height = '100%', mapViewProps, markerSize = 'sm', customOrigin }) => {
    const theme = useTheme();
    const { storefront } = useStorefront();
    const { store } = useStoreLocations();
    const mapRef = useRef(null);

    // Determine the initial origin from the current store location.
    let pickup = order.getAttribute('payload.pickup');
    let dropoff = order.getAttribute('payload.dropoff');
    let initialOrigin = pickup === undefined ? createFauxPlace() : restoreFleetbasePlace(pickup);
    let [start, setStart] = useState(initialOrigin);
    let end = restoreFleetbasePlace(dropoff);
    let origin = getCoordinatesObject(start);
    let destination = getCoordinatesObject(end);
    let initialDeltas = calculateDeltas(zoom);
    let [mapRegion, setMapRegion] = useState({
        ...origin,
        latitudeDelta: initialDeltas,
        longitudeDelta: initialDeltas,
    });
    const [zoomLevel, setZoomLevel] = useState(calculateZoomLevel(initialDeltas));
    const [findingOrigin, setFindingOrigin] = useState(true);
    const [dontFindOrigin, setDontFindOrigin] = useState(false);
    const [ready, setReady] = useState(false);
    const markerOffset = calculateOffset(zoomLevel);
    const driverAssigned = order.getAttribute('driver_assigned') ? new Driver(order.getAttribute('driver_assigned')) : null;
    const isOriginFoodTruck = start instanceof FoodTruck || start.resource === 'food-truck';
    const isPickupOrder = order.getAttribute('meta.is_pickup');

    const handleRegionChangeComplete = (region) => {
        setMapRegion(region);
        const newZoomLevel = calculateZoomLevel(region.latitudeDelta);
        setZoomLevel(newZoomLevel);
    };

    const fitToRoute = ({ coordinates }) => {
        mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
        });
    };

    const focusDriver = ({ coordinates }) => {
        mapRef.current.animateToRegion(
            {
                latitude,
                longitude,
                latitudeDelta: initialDeltas,
                longitudeDelta: initialDeltas,
            },
            500
        );
    };

    const updateOriginFromCustomOrigin = useCallback(async () => {
        if (dontFindOrigin) return;
        if (!customOrigin) {
            setFindingOrigin(false);
            return;
        }

        if (typeof customOrigin !== 'string') {
            // Assume customOrigin is already an origin object.
            if (customOrigin.id && customOrigin.id !== start.id) {
                setStart(customOrigin);
                setFindingOrigin(false);
                setReady(true);
            }
            return;
        }

        // Will be loading a new origin
        setFindingOrigin(true);

        // customOrigin is a string ID.
        if (customOrigin.startsWith('food_truck')) {
            const cachedFoodTruck = getFoodTruckById(customOrigin);
            if (cachedFoodTruck) {
                setStart(cachedFoodTruck);
                setFindingOrigin(false);
                setReady(true);
            }

            try {
                const foodTruck = await storefront.foodTrucks.queryRecord({ public_id: customOrigin, with_deleted: true });
                if (isArray(foodTruck) && foodTruck.length) {
                    setStart(foodTruck[0]);
                } else {
                    setStart(foodTruck);
                }
            } catch (error) {
                setDontFindOrigin(true);
                console.error('Error fetching food truck origin:', error);
            } finally {
                setFindingOrigin(false);
                setReady(true);
            }
        } else if (customOrigin.startsWith('store_location')) {
            if (customOrigin !== start.store_location_id) {
                try {
                    const storeLocation = await store.getLocation(customOrigin);
                    setStart(
                        restoreFleetbasePlace({
                            ...storeLocation.getAttribute('place'),
                            store_location_id: storeLocation.id,
                        })
                    );
                } catch (error) {
                    setDontFindOrigin(true);
                    console.error('Error fetching store location origin:', error);
                } finally {
                    setFindingOrigin(false);
                    setReady(true);
                }
            }
        }
    }, [customOrigin, storefront, store, start]);

    // Run the update when customOrigin changes.
    useEffect(() => {
        if (!storefront || !store) {
            setFindingOrigin(false);
            setReady(true);
            return;
        }

        updateOriginFromCustomOrigin();
    }, [storefront, store]);

    return (
        <YStack flex={1} position='relative' overflow='hidden' width={width} height={height}>
            <LoadingOverlay visible={findingOrigin} />
            <MapView
                ref={mapRef}
                style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }}
                initialRegion={mapRegion}
                onRegionChangeComplete={handleRegionChangeComplete}
                mapType={storefrontConfig('defaultMapType', 'standard')}
                {...mapViewProps}
            >
                {ready && driverAssigned && !isOriginFoodTruck && <DriverMarker driver={driverAssigned} onMovement={focusDriver} />}
                {ready && isOriginFoodTruck && (
                    <VehicleMarker key={start.id} vehicle={new Vehicle(start.getAttribute('vehicle'), fleetbaseAdapter)}>
                        <YStack opacity={0.9} mt='$2' bg='$background' borderRadius='$6' px='$2' py='$1' alignItems='center' justifyContent='center'>
                            <Text fontSize={14} color='$textPrimary' numberOfLines={1}>
                                Truck {start.getAttribute('vehicle.plate_number')}
                            </Text>
                        </YStack>
                    </VehicleMarker>
                )}
                {ready && !isOriginFoodTruck && (
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
                )}
                {ready && (
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
                )}

                {ready && origin && destination && findingOrigin === false && (
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

export default LiveOrderRoute;
