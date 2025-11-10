import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Text, YStack, XStack, useTheme, Stack } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStore, faPerson } from '@fortawesome/free-solid-svg-icons';
import { Driver, Vehicle } from '@fleetbase/sdk';
import { FoodTruck } from '@fleetbase/storefront';
import { restoreFleetbasePlace, getCoordinates, makeCoordinatesFloat, formattedAddressFromPlace, createFauxPlace } from '../utils/location';
import { config, storefrontConfig, getFoodTruckById, isArray } from '../utils';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import LocationMarker from './LocationMarker';
import DriverMarker from './DriverMarker';
import VehicleMarker from './VehicleMarker';
import LoadingOverlay from './LoadingOverlay';
import useStoreLocations from '../hooks/use-store-locations';
import useStorefront from '../hooks/use-storefront';
import { adapter as fleetbaseAdapter } from '../hooks/use-fleetbase';

/* ---------- Helpers ---------- */
const calculateDeltas = (zoom) => {
    const baseDelta = 0.005;
    return baseDelta * zoom;
};

const calculateZoomLevel = (latitudeDelta) => Math.log2(360 / latitudeDelta);

const calculateOffset = (zoomLevel) => {
    const baseOffsetX = 50;
    const baseOffsetY = -700;
    const zoomFactor = 1 / Math.max(zoomLevel, 1);
    return { x: baseOffsetX * zoomFactor, y: baseOffsetY * zoomFactor };
};

// Safe coordinate extractor
const toCoords = (place) => {
    if (!place) return null;
    try {
        const [lat, lng] = getCoordinates(place);
        const fLat = parseFloat(lat);
        const fLng = parseFloat(lng);
        if (Number.isFinite(fLat) && Number.isFinite(fLng)) {
            return { latitude: fLat, longitude: fLng };
        }
    } catch {}
    return null;
};

const DEFAULT_REGION = {
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

const LiveOrderRoute = ({ children, order, zoom = 1, width = '100%', height = '100%', mapViewProps, markerSize = 'sm', customOrigin }) => {
    const theme = useTheme();
    const { storefront } = useStorefront();
    const { store } = useStoreLocations();

    const mapRef = useRef(null);
    const bearingRaf = useRef(null);
    const isPollingBearing = useRef(false);
    const lastFollowTsRef = useRef(0);

    const [bearing, setBearing] = useState(0);
    const [findingOrigin, setFindingOrigin] = useState(true);
    const [dontFindOrigin, setDontFindOrigin] = useState(false);
    const [ready, setReady] = useState(false);

    // Raw payload places (may be undefined/null)
    const pickup = order.getAttribute('payload.pickup');
    const dropoff = order.getAttribute('payload.dropoff');

    // Restore to Place-like objects safely
    const restoredPickup = useMemo(() => (pickup ? restoreFleetbasePlace(pickup) : null), [pickup]);
    const restoredDropoff = useMemo(() => (dropoff ? restoreFleetbasePlace(dropoff) : null), [dropoff]);

    // Choose initial start: pickup -> faux -> (later customOrigin can override)
    const initialStart = useMemo(() => restoredPickup || createFauxPlace(), [restoredPickup]);
    const [start, setStart] = useState(initialStart);

    // Coordinates (safe)
    const origin = useMemo(() => toCoords(start), [start]);
    const destination = useMemo(() => toCoords(restoredDropoff), [restoredDropoff]);
    const initialDeltas = useMemo(() => calculateDeltas(zoom), [zoom]);

    // Initial region: origin -> destination -> default
    const mapInitialRegion = useMemo(() => {
        if (origin) return { ...origin, latitudeDelta: initialDeltas, longitudeDelta: initialDeltas };
        if (destination) return { ...destination, latitudeDelta: initialDeltas, longitudeDelta: initialDeltas };
        return DEFAULT_REGION;
    }, [origin, destination, initialDeltas]);

    const [zoomLevel, setZoomLevel] = useState(() => calculateZoomLevel(mapInitialRegion.latitudeDelta));
    const markerOffset = useMemo(() => calculateOffset(zoomLevel), [zoomLevel]);

    const driverAssigned = useMemo(() => {
        const driverObj = order.getAttribute('driver_assigned');
        return driverObj ? new Driver(driverObj) : null;
    }, [order]);

    const isOriginFoodTruck = useMemo(() => start instanceof FoodTruck || start?.resource === 'food-truck', [start]);

    // Follow moving marker when present
    const shouldFollowMoving = useMemo(() => ready && ((driverAssigned && !isOriginFoodTruck) || isOriginFoodTruck), [ready, driverAssigned, isOriginFoodTruck]);
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

    /* ---------- Region/Zoom ---------- */
    const handleRegionChangeComplete = useCallback((region) => {
        if (!region || !Number.isFinite(region.latitudeDelta)) return;
        setZoomLevel(calculateZoomLevel(region.latitudeDelta));
    }, []);

    /* ---------- Fit route (only when not following) ---------- */
    const fitToRoute = useCallback(
        ({ coordinates }) => {
            if (!coordinates || coordinates.length < 2) return;

            mapRef.current?.fitToCoordinates?.(coordinates, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        },
        [shouldFollowMoving]
    );

    /* ---------- Follow moving marker ---------- */
    const focusMoving = useCallback(
        (coords, opts = {}) => {
            const { latitude, longitude } = coords || {};
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

            const now = Date.now();
            if (now - lastFollowTsRef.current < 250) return; // throttle ~4Hz
            lastFollowTsRef.current = now;

            const heading = typeof opts.heading === 'number' ? opts.heading : undefined;

            mapRef.current?.animateCamera?.(
                {
                    center: { latitude, longitude },
                    heading,
                },
                { duration: 280 }
            );

            mapRef.current?.animateToRegion?.(
                {
                    latitude,
                    longitude,
                    latitudeDelta: initialDeltas,
                    longitudeDelta: initialDeltas,
                },
                300
            );
        },
        [initialDeltas]
    );

    /* ---------- customOrigin resolution ---------- */
    const updateOriginFromCustomOrigin = useCallback(async () => {
        if (dontFindOrigin || findingOrigin) return;

        // No custom origin: we’re done (we already seeded start)
        if (!customOrigin) {
            setFindingOrigin(false);
            setReady(true);
            return;
        }

        setFindingOrigin(true);

        try {
            if (typeof customOrigin !== 'string') {
                if (customOrigin.id && customOrigin.id !== start?.id) {
                    setStart(customOrigin);
                }
            } else if (customOrigin.startsWith('food_truck')) {
                const cachedFoodTruck = getFoodTruckById(customOrigin);
                if (cachedFoodTruck) {
                    setStart(cachedFoodTruck);
                    setDontFindOrigin(true);
                } else if (storefront) {
                    const foodTruck = await storefront.foodTrucks.queryRecord({
                        public_id: customOrigin,
                        with_deleted: true,
                    });
                    setStart(isArray(foodTruck) && foodTruck.length ? foodTruck[0] : foodTruck);
                    setDontFindOrigin(true);
                }
            } else if (customOrigin.startsWith('store_location')) {
                if (store && customOrigin !== start?.store_location_id) {
                    const storeLocation = await store.getLocation(customOrigin);
                    setStart(
                        restoreFleetbasePlace({
                            ...storeLocation.getAttribute('place'),
                            store_location_id: storeLocation.id,
                        })
                    );
                    setDontFindOrigin(true);
                }
            }
        } catch (error) {
            setDontFindOrigin(true);
            console.error('Error fetching custom origin:', error);
        } finally {
            setFindingOrigin(false);
            setReady(true);
        }
    }, [customOrigin, dontFindOrigin, start?.id, start?.store_location_id, storefront, store]);

    /* ---------- Effects ---------- */
    // Resolve origin once storefront/store are available (don’t block rendering forever)
    useEffect(() => {
        if (!storefront || !store) {
            setFindingOrigin(false);
            setReady(true);
            return;
        }
        updateOriginFromCustomOrigin();
    }, [storefront, store, updateOriginFromCustomOrigin]);

    // If origin becomes available later, center once
    useEffect(() => {
        if (origin && mapRef.current) {
            mapRef.current.animateToRegion({ ...origin, latitudeDelta: initialDeltas, longitudeDelta: initialDeltas }, 250);
        }
    }, [origin, initialDeltas]);

    /* ---------- Render ---------- */
    return (
        <YStack flex={1} position='relative' overflow='hidden' width={width} height={height}>
            <LoadingOverlay visible={findingOrigin} />

            <MapView
                ref={mapRef}
                style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }}
                initialRegion={mapInitialRegion}
                onRegionChangeComplete={handleRegionChangeComplete}
                mapType={storefrontConfig('defaultMapType', 'standard')}
                showsCompass={false}
                onRegionChange={startBearingPoll}
                onRegionChangeComplete={stopBearingPoll}
                {...mapViewProps}
            >
                {/* DRIVER MARKER — follow when visible */}
                {ready && driverAssigned && !isOriginFoodTruck && (
                    <DriverMarker
                        driver={driverAssigned}
                        onMovement={({ coordinates, heading }) => {
                            if (shouldFollowMoving) focusMoving(coordinates, { heading });
                        }}
                    />
                )}

                {/* VEHICLE MARKER (Food Truck origin) — follow when visible */}
                {ready && isOriginFoodTruck && start?.getAttribute?.('vehicle') && (
                    <VehicleMarker
                        key={start?.id}
                        vehicle={new Vehicle(start.getAttribute('vehicle'), fleetbaseAdapter)}
                        mapBearing={bearing}
                        providerIsGoogle={providerIsGoogle}
                        onMovement={({ coordinates, heading }) => {
                            if (shouldFollowMoving) focusMoving(coordinates, { heading });
                        }}
                    >
                        <YStack opacity={0.9} mt='$2' bg='$background' borderRadius='$6' px='$2' py='$1' alignItems='center' justifyContent='center'>
                            <Text fontSize={14} color='$textPrimary' numberOfLines={1}>
                                Truck {start.getAttribute('vehicle.plate_number')}
                            </Text>
                        </YStack>
                    </VehicleMarker>
                )}

                {/* ORIGIN PIN (Store) */}
                {ready && !isOriginFoodTruck && origin && (
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
                                        {start?.getAttribute?.('name', `${store?.getAttribute('name') ?? 'Store'} Location`)}
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

                {/* DESTINATION PIN */}
                {ready && destination && restoredDropoff && (
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
                                        {restoredDropoff.getAttribute('name') ?? 'Your Location'}
                                    </Text>
                                    <Text fontSize='$2' color='$gray-200' numberOfLines={1}>
                                        {formattedAddressFromPlace(restoredDropoff)}
                                    </Text>
                                </YStack>
                            </XStack>
                        </YStack>
                        <LocationMarker size={markerSize} />
                    </Marker>
                )}

                {/* ROUTE (only when both ends valid; skip auto-fit if following) */}
                {ready && origin && destination && !findingOrigin && (
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

            {/* Overlay slot */}
            <YStack position='absolute' style={{ ...StyleSheet.absoluteFillObject }}>
                {children}
            </YStack>
        </YStack>
    );
};

export default LiveOrderRoute;
