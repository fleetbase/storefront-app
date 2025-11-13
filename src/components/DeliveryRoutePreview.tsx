import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Text, YStack, XStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStore, faPerson } from '@fortawesome/free-solid-svg-icons';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { Vehicle } from '@fleetbase/sdk';
import { FoodTruck } from '@fleetbase/storefront';
import { restoreFleetbasePlace, getCoordinatesObject, createFauxPlace, formattedAddressFromPlace, makeCoordinatesFloat } from '../utils/location';
import { config, storefrontConfig, getFoodTruckById, isArray, isObject } from '../utils';
import LocationMarker from './LocationMarker';
import VehicleMarker from './VehicleMarker';
import LoadingOverlay from './LoadingOverlay';
import useCurrentLocation from '../hooks/use-current-location';
import useStoreLocations from '../hooks/use-store-locations';
import useStorefront from '../hooks/use-storefront';
import { adapter as fleetbaseAdapter } from '../hooks/use-fleetbase';

/* ---------- Helpers ---------- */
const DEFAULT_REGION = {
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

const calculateDeltas = (zoom) => {
    const baseDelta = 0.02;
    return baseDelta * zoom;
};

const calculateZoomLevel = (latitudeDelta) => {
    if (!latitudeDelta || latitudeDelta <= 0) {
        return 16;
    }
    return Math.log2(360 / latitudeDelta);
};

const calculateOffset = (zoomLevel) => {
    const baseOffsetX = 50;
    const baseOffsetY = -700;
    const safeZoom = Math.max(zoomLevel || 1, 1);
    const zoomFactor = 1 / safeZoom;
    return {
        x: baseOffsetX * zoomFactor,
        y: baseOffsetY * zoomFactor,
    };
};

const getSafeInitialRegion = (origin, initialDeltas) => {
    if (origin && Number.isFinite(origin.latitude) && Number.isFinite(origin.longitude)) {
        return {
            latitude: origin.latitude,
            longitude: origin.longitude,
            latitudeDelta: initialDeltas,
            longitudeDelta: initialDeltas,
        };
    }

    return DEFAULT_REGION;
};

const DeliveryRoutePreview = ({ children, zoom = 1, width = '100%', height = '100%', mapViewProps, markerSize = 'sm', customOrigin }) => {
    const theme = useTheme();
    const { storefront } = useStorefront();
    const { store, currentStoreLocation } = useStoreLocations();
    const { currentLocation } = useCurrentLocation();

    const mapRef = useRef(null);
    const bearingRaf = useRef(null);
    const isPollingBearing = useRef(false);
    const lastFollowTsRef = useRef(0);

    const [bearing, setBearing] = useState(0);
    const [findingOrigin, setFindingOrigin] = useState(false);
    const [ready, setReady] = useState(false);

    // -------- Origin & destination --------
    const initialStart = useMemo(
        () =>
            currentStoreLocation === undefined
                ? createFauxPlace()
                : restoreFleetbasePlace({
                      ...currentStoreLocation.getAttribute('place'),
                      store_location_id: currentStoreLocation.id,
                  }),
        [currentStoreLocation]
    );

    // REFACTORED: Handle object customOrigin immediately without async
    const resolvedStart = useMemo(() => {
        // If customOrigin is an object with id, use it directly
        if (isObject(customOrigin) && customOrigin.id) {
            return customOrigin;
        }
        // Otherwise use initial start (will be fetched async if it's a string ID)
        return initialStart;
    }, [customOrigin, initialStart]);

    const [start, setStart] = useState(resolvedStart);
    const end = useMemo(() => restoreFleetbasePlace(currentLocation), [currentLocation]);
    const origin = useMemo(() => getCoordinatesObject(start), [start]);
    const destination = useMemo(() => getCoordinatesObject(end), [end]);
    const initialDeltas = useMemo(() => calculateDeltas(zoom), [zoom]);

    // Map region state: kept in sync with user interaction
    const [mapRegion, setMapRegion] = useState(() => getSafeInitialRegion(origin, initialDeltas));
    const [zoomLevel, setZoomLevel] = useState(() => calculateZoomLevel(mapRegion.latitudeDelta));
    const markerOffset = useMemo(() => calculateOffset(zoomLevel), [zoomLevel]);
    const isOriginFoodTruck = useMemo(() => start instanceof FoodTruck || start?.resource === 'food-truck', [start]);
    const providerIsGoogle = Platform.OS === 'android' || PROVIDER_DEFAULT === PROVIDER_GOOGLE;

    /* ---------- Bearing polling ---------- */
    const startBearingPoll = useCallback(() => {
        if (isPollingBearing.current) return;
        isPollingBearing.current = true;

        const tick = async () => {
            try {
                const cam = await mapRef.current?.getCamera?.();
                if (cam?.heading != null) setBearing(cam.heading);
            } catch {}
            if (isPollingBearing.current) {
                bearingRaf.current = requestAnimationFrame(tick);
            }
        };

        bearingRaf.current = requestAnimationFrame(tick);
    }, []);

    const stopBearingPoll = useCallback(() => {
        isPollingBearing.current = false;
        if (bearingRaf.current) {
            cancelAnimationFrame(bearingRaf.current);
            bearingRaf.current = null;
        }
    }, []);

    // -------- Map handlers --------
    const handleRegionChangeComplete = useCallback((region) => {
        if (!region) return;
        setMapRegion(region);

        if (typeof region.latitudeDelta === 'number') {
            setZoomLevel(calculateZoomLevel(region.latitudeDelta));
        }
    }, []);

    const fitToRoute = useCallback(({ coordinates }) => {
        if (!mapRef.current || !coordinates || coordinates.length === 0) {
            return;
        }

        mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 20, right: 50, bottom: 20, left: 50 },
            animated: true,
        });
    }, []);

    const getRegionForTruckAndDestination = (
        truck,
        dest,
        {
            paddingFactor = 1.4, // how much space around the line
            minDelta = 0.005, // how close you’re allowed to zoom
        } = {}
    ) => {
        if (!truck || !dest || !Number.isFinite(truck.latitude) || !Number.isFinite(truck.longitude) || !Number.isFinite(dest.latitude) || !Number.isFinite(dest.longitude)) {
            return null;
        }

        const minLat = Math.min(truck.latitude, dest.latitude);
        const maxLat = Math.max(truck.latitude, dest.latitude);
        const minLng = Math.min(truck.longitude, dest.longitude);
        const maxLng = Math.max(truck.longitude, dest.longitude);

        let latitudeDelta = maxLat - minLat || minDelta;
        let longitudeDelta = maxLng - minLng || minDelta;

        latitudeDelta *= paddingFactor;
        longitudeDelta *= paddingFactor;

        if (latitudeDelta < minDelta) latitudeDelta = minDelta;
        if (longitudeDelta < minDelta) longitudeDelta = minDelta;

        const latitude = (minLat + maxLat) / 2;
        const longitude = (minLng + maxLng) / 2;

        return { latitude, longitude, latitudeDelta, longitudeDelta };
    };

    // Follow vehicle movement (for food-truck origin)
    const focusMoving = useCallback(
        (coords) => {
            if (!mapRef.current || !coords) return;

            const { latitude, longitude } = coords;
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

            const now = Date.now();
            if (now - lastFollowTsRef.current < 250) {
                return; // throttle a bit
            }
            lastFollowTsRef.current = now;

            // If we have a valid destination, keep BOTH truck + destination in view
            if (destination && Number.isFinite(destination.latitude) && Number.isFinite(destination.longitude)) {
                mapRef.current.fitToCoordinates(
                    [
                        { latitude, longitude },
                        {
                            latitude: destination.latitude,
                            longitude: destination.longitude,
                        },
                    ],
                    {
                        top: 40,
                        right: 40,
                        bottom: 40,
                        left: 60,
                    },
                    true
                );

                return;
            }

            // Fallback: just follow the truck using current zoom
            const { latitudeDelta, longitudeDelta } = mapRegion || {};

            const nextRegion = {
                latitude,
                longitude,
                latitudeDelta: typeof latitudeDelta === 'number' ? latitudeDelta : initialDeltas,
                longitudeDelta: typeof longitudeDelta === 'number' ? longitudeDelta : initialDeltas,
            };

            mapRef.current.animateToRegion(nextRegion, 250);
        },
        [destination, mapRegion, initialDeltas]
    );

    const handleMovement = useCallback(
        ({ coordinates }) => {
            if (coordinates) focusMoving(coordinates);
        },
        [focusMoving]
    );

    /* ---------- REFACTORED: Async fetch for string IDs only ---------- */
    const fetchOriginFromStringId = useCallback(async () => {
        // Only fetch if customOrigin is a string ID (not an object)
        if (!customOrigin || typeof customOrigin !== 'string') {
            setReady(true);
            return;
        }

        // Already fetched
        if (start?.id === customOrigin || start?.store_location_id === customOrigin) {
            setReady(true);
            return;
        }

        setFindingOrigin(true);

        try {
            if (customOrigin.startsWith('food_truck')) {
                const cachedFoodTruck = getFoodTruckById(customOrigin);
                if (cachedFoodTruck) {
                    setStart(cachedFoodTruck);
                } else if (storefront) {
                    const foodTruck = await storefront.foodTrucks.queryRecord({
                        public_id: customOrigin,
                        with_deleted: true,
                    });
                    const resolvedFoodTruck = isArray(foodTruck) && foodTruck.length ? foodTruck[0] : foodTruck;
                    setStart(resolvedFoodTruck);
                }
            } else if (customOrigin.startsWith('store_location')) {
                if (store) {
                    const storeLocation = await store.getLocation(customOrigin);
                    setStart(
                        restoreFleetbasePlace({
                            ...storeLocation.getAttribute('place'),
                            store_location_id: storeLocation.id,
                        })
                    );
                }
            }
        } catch (error) {
            console.error('Error fetching custom origin:', error);
        } finally {
            setDontFindOrigin(true);
            setFindingOrigin(false);
            setReady(true);
        }
    }, [customOrigin, start?.id, start?.store_location_id, storefront, store]);

    useEffect(() => {
        if (!storefront || !store) {
            setReady(true);
            return;
        }

        fetchOriginFromStringId();
    }, [storefront, store, customOrigin, fetchOriginFromStringId]);

    // Keep initial region sane if origin becomes available later
    useEffect(() => {
        if (!mapRef.current) return;
        if (origin && Number.isFinite(origin.latitude) && Number.isFinite(origin.longitude)) {
            mapRef.current.animateToRegion(
                {
                    ...origin,
                    latitudeDelta: initialDeltas,
                    longitudeDelta: initialDeltas,
                },
                250
            );
        }
    }, [origin, initialDeltas]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopBearingPoll();
            isPollingBearing.current = false;
            lastFollowTsRef.current = 0;
        };
    }, [stopBearingPoll]);

    // -------- Render --------
    const initialRegion = useMemo(() => getSafeInitialRegion(origin, initialDeltas), [origin, initialDeltas]);

    return (
        <YStack flex={1} position='relative' overflow='hidden' width={width} height={height}>
            <LoadingOverlay visible={findingOrigin} />

            <MapView
                ref={mapRef}
                style={{
                    ...StyleSheet.absoluteFillObject,
                    width: '100%',
                    height: '100%',
                }}
                initialRegion={initialRegion}
                onRegionChangeComplete={handleRegionChangeComplete}
                mapType={storefrontConfig('defaultMapType', 'standard')}
                showsCompass={false}
                onRegionChange={() => startBearingPoll()}
                onRegionChangeComplete={(region) => {
                    stopBearingPoll();
                    handleRegionChangeComplete(region);
                }}
                {...mapViewProps}
            >
                {/* LIVE VEHICLE (Food Truck origin) */}
                {ready && isOriginFoodTruck && start?.getAttribute?.('vehicle') && (
                    <VehicleMarker
                        key={start.id}
                        vehicle={new Vehicle(start.getAttribute('vehicle'), fleetbaseAdapter)}
                        mapBearing={bearing}
                        providerIsGoogle={providerIsGoogle}
                        onMovement={handleMovement}
                    >
                        <YStack opacity={0.9} mt='$2' bg='$background' borderRadius='$6' px='$2' py='$1' alignItems='center' justifyContent='center'>
                            <Text fontSize={14} color='$textPrimary' numberOfLines={1}>
                                Truck {start.getAttribute('vehicle.plate_number')}
                            </Text>
                        </YStack>
                    </VehicleMarker>
                )}

                {/* STATIC ORIGIN (Store) */}
                {ready && !isOriginFoodTruck && origin && Number.isFinite(origin.latitude) && Number.isFinite(origin.longitude) && (
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
                                        {start?.getAttribute?.('name', `${store?.getAttribute('name')} Location`)}
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

                {/* DESTINATION (User) */}
                {ready && destination && Number.isFinite(destination.latitude) && Number.isFinite(destination.longitude) && (
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
                                        {end?.getAttribute?.('name') ?? 'Your Location'}
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

                {/* ROUTE */}
                {ready &&
                    origin &&
                    destination &&
                    Number.isFinite(origin.latitude) &&
                    Number.isFinite(origin.longitude) &&
                    Number.isFinite(destination.latitude) &&
                    Number.isFinite(destination.longitude) &&
                    !findingOrigin && (
                        <MapViewDirections
                            origin={makeCoordinatesFloat(origin)}
                            destination={makeCoordinatesFloat(destination)}
                            apikey={config('GOOGLE_MAPS_API_KEY')}
                            strokeWidth={4}
                            strokeColor={theme['$blue-500'].val}
                            onReady={fitToRoute}
                        />
                    )}
            </MapView>

            {/* Overlay content */}
            <YStack position='absolute' style={{ ...StyleSheet.absoluteFillObject }}>
                {children}
            </YStack>
        </YStack>
    );
};

export default DeliveryRoutePreview;
