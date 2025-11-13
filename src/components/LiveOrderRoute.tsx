import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Text, YStack, XStack, useTheme, Stack } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStore, faPerson } from '@fortawesome/free-solid-svg-icons';
import { Driver, Vehicle } from '@fleetbase/sdk';
import { FoodTruck } from '@fleetbase/storefront';
import { restoreFleetbasePlace, getCoordinates, makeCoordinatesFloat, formattedAddressFromPlace, createFauxPlace } from '../utils/location';
import { config, storefrontConfig, getFoodTruckById, isArray, isObject } from '../utils';
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
    const [findingOrigin, setFindingOrigin] = useState(false);
    const [ready, setReady] = useState(false);

    // Raw payload places (may be undefined/null)
    const pickup = order.getAttribute('payload.pickup');
    const dropoff = order.getAttribute('payload.dropoff');

    // Restore to Place-like objects safely
    const restoredPickup = useMemo(() => (pickup ? restoreFleetbasePlace(pickup) : null), [pickup]);
    const restoredDropoff = useMemo(() => (dropoff ? restoreFleetbasePlace(dropoff) : null), [dropoff]);

    // Choose initial start: pickup -> faux
    const initialStart = useMemo(() => restoredPickup || createFauxPlace(), [restoredPickup]);

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

    // Update start when resolvedStart changes (handles object customOrigin immediately)
    useEffect(() => {
        setStart(resolvedStart);
    }, [resolvedStart]);

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
    const grayColor = useMemo(() => theme['$gray-200']?.val || '#E5E7EB', [theme]);
    const blueColor = useMemo(() => theme['$blue-500']?.val || '#3B82F6', [theme]);

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
    const fitToRoute = useCallback(({ coordinates }) => {
        if (!coordinates || coordinates.length < 2) return;

        mapRef.current?.fitToCoordinates?.(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
        });
    }, []);

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

    const handleMovement = useCallback(
        ({ coordinates, heading }) => {
            if (shouldFollowMoving) focusMoving(coordinates, { heading });
        },
        [shouldFollowMoving, focusMoving]
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

    /* ---------- Effects ---------- */
    // Fetch origin if it's a string ID (only when storefront/store are ready)
    useEffect(() => {
        if (!storefront || !store) {
            setReady(true);
            return;
        }

        fetchOriginFromStringId();
    }, [storefront, store, customOrigin, fetchOriginFromStringId]);

    // If origin becomes available later, center once
    // useEffect(() => {
    //     if (origin && mapRef.current) {
    //         mapRef.current.animateToRegion({ ...origin, latitudeDelta: initialDeltas, longitudeDelta: initialDeltas }, 250);
    //     }
    // }, [origin, initialDeltas]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopBearingPoll();
            isPollingBearing.current = false;
            lastFollowTsRef.current = 0;
        };
    }, [stopBearingPoll]);

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
                {/* ONLY RENDER WHEN READY */}
                {ready && (
                    <>
                        {/* DRIVER MARKER */}
                        {driverAssigned && !isOriginFoodTruck && <DriverMarker driver={driverAssigned} onMovement={handleMovement} />}

                        {/* VEHICLE MARKER (Food Truck) */}
                        {isOriginFoodTruck && start?.getAttribute?.('vehicle') && (
                            <VehicleMarker
                                key={start?.id}
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

                        {/* ORIGIN PIN */}
                        {origin && !shouldFollowMoving && (
                            <Marker coordinate={origin} anchor={{ x: 0.5, y: 1 }}>
                                <YStack alignItems='center' space='$1'>
                                    <YStack bg='$background' borderRadius='$6' px='$3' py='$2' borderWidth={1} borderColor='$borderColor'>
                                        <XStack alignItems='center' space='$2'>
                                            <FontAwesomeIcon icon={faStore} size={14} color={grayColor} />
                                            <YStack>
                                                <Text fontSize={12} fontWeight='600' color='$textPrimary' numberOfLines={1}>
                                                    {start?.getAttribute?.('name') || 'Origin'}
                                                </Text>
                                                {start?.getAttribute && (
                                                    <Text fontSize={10} color='$textSecondary' numberOfLines={1}>
                                                        {formattedAddressFromPlace(start)}
                                                    </Text>
                                                )}
                                            </YStack>
                                        </XStack>
                                    </YStack>
                                    <LocationMarker size={markerSize} />
                                </YStack>
                            </Marker>
                        )}

                        {/* DESTINATION PIN */}
                        {destination && (
                            <Marker coordinate={destination} anchor={{ x: 0.5, y: 1 }}>
                                <YStack alignItems='center' space='$1'>
                                    <YStack bg='$background' borderRadius='$6' px='$3' py='$2' borderWidth={1} borderColor='$borderColor'>
                                        <XStack alignItems='center' space='$2'>
                                            <FontAwesomeIcon icon={faPerson} size={14} color={grayColor} />
                                            <YStack>
                                                <Text fontSize={12} fontWeight='600' color='$textPrimary' numberOfLines={1}>
                                                    {restoredDropoff?.getAttribute?.('name') || 'Destination'}
                                                </Text>
                                                {restoredDropoff && (
                                                    <Text fontSize={10} color='$textSecondary' numberOfLines={1}>
                                                        {formattedAddressFromPlace(restoredDropoff)}
                                                    </Text>
                                                )}
                                            </YStack>
                                        </XStack>
                                    </YStack>
                                    <LocationMarker size={markerSize} />
                                </YStack>
                            </Marker>
                        )}

                        {/* ROUTE */}
                        {origin &&
                            destination &&
                            Number.isFinite(origin.latitude) &&
                            Number.isFinite(origin.longitude) &&
                            Number.isFinite(destination.latitude) &&
                            Number.isFinite(destination.longitude) && (
                                <MapViewDirections
                                    origin={origin}
                                    destination={destination}
                                    apikey={config('GOOGLE_MAPS_API_KEY')}
                                    strokeWidth={4}
                                    strokeColor={blueColor}
                                    onReady={fitToRoute}
                                />
                            )}
                    </>
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
