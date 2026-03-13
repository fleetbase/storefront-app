import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Pressable, Platform, View, FlatList } from 'react-native';
import MapView, { Polygon, Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { XStack, YStack, Text, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapLocationDot, faCircleInfo, faHome } from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FastImage from 'react-native-fast-image';
import { Vehicle } from '@fleetbase/sdk';
import { getCoordinates, isPointInGeoJSONPolygon, formattedAddressFromPlace, makeCoordinatesFloat } from '../utils/location';
import { storefrontConfig, isArray, isNone, hexToRGBA, handleNavigateNewLocation } from '../utils';
import { useLanguage } from '../contexts/LanguageContext';
import useFleetbase from '../hooks/use-fleetbase';
import useStorefront from '../hooks/use-storefront';
import useStorage from '../hooks/use-storage';
import useDimensions from '../hooks/use-dimensions';
import useAppTheme from '../hooks/use-app-theme';
import useCurrentLocation from '../hooks/use-current-location';
import useSafeTabBarHeight from '../hooks/use-safe-tab-bar-height';
import VehicleMarker from '../components/VehicleMarker';
import CustomHeader from '../components/CustomHeader';
import LocationPicker from '../components/LocationPicker';
import CartButton from '../components/CartButton';
import LocaleButton from '../components/LocaleButton';

function findCurrentZone(coordinates, zones = []) {
    return zones.find((zone) => {
        return isPointInGeoJSONPolygon(coordinates, zone.border);
    });
}

function findAvailableTrucks(currentZone, foodTrucks = []) {
    if (!currentZone) {
        return [];
    }
    return foodTrucks.filter((foodTruck) => {
        return foodTruck.zone && foodTruck.zone.id === currentZone.id && foodTruck.vehicle;
    });
}

function getPolygonCoordinates(geoJsonPolygon) {
    if (!geoJsonPolygon || !geoJsonPolygon.coordinates) {
        return [];
    }

    // GeoJSON stores polygons as [[[lng, lat], [lng, lat], ...]]
    return geoJsonPolygon.coordinates[0].map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

function getPolygonBoundingBox(polygonCoordinates) {
    if (!polygonCoordinates || polygonCoordinates.length === 0) return null;

    let minLat = polygonCoordinates[0].latitude;
    let maxLat = polygonCoordinates[0].latitude;
    let minLng = polygonCoordinates[0].longitude;
    let maxLng = polygonCoordinates[0].longitude;

    polygonCoordinates.forEach(({ latitude, longitude }) => {
        if (latitude < minLat) minLat = latitude;
        if (latitude > maxLat) maxLat = latitude;
        if (longitude < minLng) minLng = longitude;
        if (longitude > maxLng) maxLng = longitude;
    });

    return { minLat, maxLat, minLng, maxLng };
}

const isAndroid = Platform.OS === 'android';

const FoodTruckScreen = () => {
    const navigation = useNavigation();
    const theme = useTheme();
    const { t } = useLanguage();
    const { isDarkMode } = useAppTheme();
    const { screenWidth } = useDimensions();
    const { fleetbase, adapter: fleetbaseAdapter } = useFleetbase();
    const { storefront } = useStorefront();
    const { currentLocation } = useCurrentLocation();
    const insets = useSafeAreaInsets();
    const tabBarHeight = useSafeTabBarHeight();
    const currentLocationCoordinates = getCoordinates(currentLocation);
    const [mapRegion, setMapRegion] = useState({
        latitude: currentLocationCoordinates[0],
        longitude: currentLocationCoordinates[1],
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });

    // On Android, wait for valid location before showing map to prevent West Africa flash
    const [isMapReady, setIsMapReady] = useState(!isAndroid);

    useEffect(() => {
        if (isAndroid && currentLocation) {
            const [lat, lng] = currentLocationCoordinates;
            // Only show map when we have valid coordinates (not 0,0)
            if (lat !== 0 && lng !== 0) {
                setIsMapReady(true);
            }
        }
    }, [currentLocation, isAndroid]);

    const mapRef = useRef(null);
    const cameraRef = useRef(null);
    const bearingRaf = useRef(null);
    const isPollingBearing = useRef(false);
    const lastFollowTsRef = useRef(0);
    const isFollowingRef = useRef(true);
    const [bearing, setBearing] = useState(0);
    const [serviceArea, setServiceArea] = useStorage('service_area');
    const [zones, setZones] = useStorage('zones', []);
    const [foodTrucks, setFoodTrucks] = useStorage('food_trucks', []);
    const [currentZone, setCurrentZone] = useStorage('current_zone');

    // The bottom spacing for the horizontal scroll strip, accounting for the
    // tab bar and safe area so the strip sits cleanly above the navigation bar
    // on both iOS and Android.
    const horizontalScrollBottom = Platform.select({
        ios: (tabBarHeight > 0 ? tabBarHeight : insets.bottom) + 12,
        android: (tabBarHeight > 0 ? tabBarHeight : insets.bottom) + 12,
    });

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

    const availableFoodTrucks = useMemo(() => {
        if (!currentZone) {
            return [];
        }

        return findAvailableTrucks(currentZone, foodTrucks);
    }, [currentLocation, currentZone, foodTrucks]);

    const loadServiceArea = useCallback(async () => {
        if (!fleetbase) {
            return null;
        }

        // Retrieve the default service area ID from the storefront configuration.
        const defaultServiceAreaId = storefrontConfig('defaultServiceArea');

        try {
            let areaRecord;

            if (defaultServiceAreaId) {
                // If a default ID is provided, try to load that specific service area.
                areaRecord = await fleetbase.serviceAreas.findRecord(defaultServiceAreaId);
            } else {
                // Otherwise, load all service areas and use the first available one.
                const areas = await fleetbase.serviceAreas.findAll();
                if (!isArray(areas) || areas.length === 0) {
                    console.error('No service areas found');
                    return null;
                }
                areaRecord = areas[0];
            }

            // Safely serialize the retrieved area record.
            const loadedServiceArea = areaRecord && typeof areaRecord.serialize === 'function' ? areaRecord.serialize() : null;

            if (!loadedServiceArea) {
                console.error('Service area could not be serialized');
                return null;
            }

            // Update state and return the loaded service area.
            setServiceArea(loadedServiceArea);
            return loadedServiceArea;
        } catch (error) {
            console.error('Error loading service area:', error);
            return null;
        }
    }, [fleetbase, setServiceArea]);

    const loadZones = useCallback(
        async (area) => {
            // Use the passed area or fall back to the one in state.
            const currentArea = area || serviceArea;
            if (!fleetbase || !currentArea || !currentArea.id) return;

            try {
                const zonesResult = await fleetbase.zones.query({ limit: -1, service_area: currentArea.id });
                const serializedZones = zonesResult.map((zone) => zone.serialize());
                setZones(serializedZones);

                const foundCurrentZone = findCurrentZone(currentLocationCoordinates, serializedZones);
                setCurrentZone((prevZone) => {
                    if (foundCurrentZone?.id !== prevZone?.id) {
                        return foundCurrentZone || null;
                    }
                    return prevZone;
                });

                return serializedZones;
            } catch (error) {
                console.error('Error loading zones:', error);
                return [];
            }
        },
        [fleetbase, setCurrentZone, setZones]
    );

    const loadFoodTrucks = useCallback(
        async (area) => {
            const currentArea = area || serviceArea;
            if (!storefront || !currentArea || !currentArea.id) return;

            try {
                const foodTrucksResult = await storefront.foodTrucks.query({ limit: -1, service_area: currentArea.id });
                const serializedFoodTrucks = foodTrucksResult.map((truck) => (typeof truck.serialize === 'function' ? truck.serialize() : truck)).filter((truck) => truck.vehicle);
                setFoodTrucks(serializedFoodTrucks);
                return serializedFoodTrucks;
            } catch (error) {
                console.error('Error loading food trucks:', error);
                return [];
            }
        },
        [storefront, setFoodTrucks]
    );

    const handlePressFoodTruck = (foodTruck) => {
        const vehicle = new Vehicle(foodTruck.vehicle, fleetbaseAdapter);
        const [longitude, latitude] = vehicle.getAttribute('location.coordinates');

        if (mapRef.current && !isNone(latitude) && !isNone(longitude)) {
            const newRegion = {
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
            mapRef.current.animateToRegion(newRegion, 1000);
        }

        navigation.navigate('Catalog', { catalogs: foodTruck.catalogs, foodTruckId: foodTruck.id });
    };

    const handlePressCurrentLocation = (currentLocation) => {
        const [longitude, latitude] = currentLocation.getAttribute('location.coordinates');

        if (mapRef.current && !isNone(latitude) && !isNone(longitude)) {
            const newRegion = {
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
            mapRef.current.animateToRegion(newRegion, 1000);
        }
    };

    const handlePressCurrentZone = () => {
        if (!mapRef.current || !currentZone?.border) return;

        focusZone(currentZone);
    };

    const focusZone = (zone) => {
        if (!mapRef.current || !zone?.border) return;

        const polygonCoordinates = getPolygonCoordinates(zone.border);
        const boundingBox = getPolygonBoundingBox(polygonCoordinates);

        if (boundingBox) {
            mapRef.current.fitToCoordinates(polygonCoordinates, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        }
    };

    const hasZoomedOutToCityLevel = (cam, region) => {
        // If camera zoom is available (Google Maps style)
        if (cam && typeof cam.zoom === 'number') {
            // Higher zoom = closer. City-level is usually around 11–13.
            // So if user zooms OUT below ~12, consider it "overview".
            return cam.zoom <= 12;
        }

        // Fallback: use latitudeDelta heuristic
        // Smaller delta = closer. Larger delta = zoomed out.
        if (region && typeof region.latitudeDelta === 'number') {
            // Tune this: ~0.1–0.2 is neighborhood/city-ish depending on latitude.
            return region.latitudeDelta >= 0.15;
        }

        return false;
    };

    const focusMoving = useCallback((coords, opts = {}) => {
        const { latitude, longitude } = coords || {};
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

        // If user disabled follow (by zooming out), do nothing.
        if (!isFollowingRef.current) return;

        const now = Date.now();
        if (now - lastFollowTsRef.current < 250) return; // throttle
        lastFollowTsRef.current = now;

        const prevCam = cameraRef.current;

        const nextCamera = {
            // always follow the vehicle center
            center: { latitude, longitude },
            // preserve user zoom / pitch if we know them
            zoom: prevCam?.zoom,
            pitch: prevCam?.pitch,
            // update heading if provided, else keep last
            heading: prevCam?.heading ?? 0,
        };

        mapRef.current?.animateCamera?.(nextCamera, { duration: 280 });
    }, []);

    useEffect(() => {
        if (!currentLocation || !zones) return;

        const foundCurrentZone = findCurrentZone(currentLocationCoordinates, zones);
        setCurrentZone((prevZone) => {
            if (foundCurrentZone?.id !== prevZone?.id) {
                focusZone(foundCurrentZone);
                return foundCurrentZone || null;
            }
            return prevZone;
        });
    }, [currentLocation?.id, zones.length]);

    useEffect(() => {
        if (!fleetbase) return;

        const load = async () => {
            const area = await loadServiceArea();
            if (area) {
                await loadZones(area);
                await loadFoodTrucks(area);
            }
        };

        load();
    }, [fleetbase]);

    // Fix Android map showing West Africa instead of correct location
    // On Android, animateToRegion with 0 duration makes it instant
    useEffect(() => {
        if (!isAndroid || !mapRef?.current || !currentLocation) return;

        // Animate to region instantly (0ms duration)
        mapRef.current.animateToRegion(makeCoordinatesFloat(mapRegion), 0);
    }, [currentLocation]);

    useEffect(() => stopBearingPoll, [stopBearingPoll]);

    const currentZoneColor = currentZone ? theme[`$green-${isDarkMode ? '400' : '600'}`].val : theme[`$red-${isDarkMode ? '400' : '600'}`].val;
    const infoColor = isDarkMode ? theme['$blue-400'].val : theme['$blue-600'].val;

    /**
     * Renders a single food truck card in the horizontal scroll strip.
     *
     * Each card displays the vehicle's avatar image (or a fallback van icon)
     * above the truck's display name (preferring `foodTruck.name`, falling
     * back to the vehicle plate number). The entire card is wrapped in a
     * Pressable that triggers the existing handlePressFoodTruck handler,
     * preserving the map-pan + Catalog navigation behaviour.
     */
    const renderFoodTruckCard = ({ item: foodTruck }) => {
        const avatarUrl = foodTruck.vehicle?.avatar_url;
        const avatarSource = avatarUrl ? { uri: avatarUrl } : require('../../assets/images/vehicles/light_commercial_van.png');
        const displayName = foodTruck.name || foodTruck.vehicle?.plate_number || t('FoodTruckScreen.truck');

        return (
            <Pressable onPress={() => handlePressFoodTruck(foodTruck)} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
                <YStack
                    alignItems='center'
                    justifyContent='center'
                    bg='$background'
                    borderRadius='$5'
                    px='$3'
                    pt='$3'
                    pb='$2'
                    mr='$3'
                    borderWidth={1}
                    borderColor='$borderColorWithShadow'
                    width={110}
                    shadowColor='$shadowColor'
                    shadowOffset={{ width: 0, height: 2 }}
                    shadowOpacity={0.12}
                    shadowRadius={4}
                    elevation={3}
                >
                    <FastImage
                        source={avatarSource}
                        style={styles.truckCardImage}
                        resizeMode={FastImage.resizeMode.contain}
                    />
                    <Text
                        color='$textPrimary'
                        fontSize={12}
                        fontWeight='600'
                        numberOfLines={2}
                        textAlign='center'
                        mt='$1'
                    >
                        {displayName}
                    </Text>
                </YStack>
            </Pressable>
        );
    };

    return (
        <YStack flex={1} alignItems='center' justifyContent='center' bg='$surface' width='100%' height='100%'>
            {isMapReady && (
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_DEFAULT}
                    style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', zIndex: 1 }}
                    initialRegion={makeCoordinatesFloat(mapRegion)}
                    mapType={storefrontConfig('defaultMapType', 'standard')}
                    showsCompass={false}
                    onRegionChange={() => startBearingPoll()}
                    onRegionChangeComplete={async (region, details) => {
                        stopBearingPoll();

                        // Grab the real camera (has zoom / pitch / heading)
                        try {
                            const cam = await mapRef.current?.getCamera?.();
                            if (cam) {
                                cameraRef.current = cam;
                            }

                            // If user zoomed out enough, disable following.
                            if (hasZoomedOutToCityLevel(cam, region)) {
                                isFollowingRef.current = false;
                            }
                        } catch (e) {
                            // fail silent is fine
                        }
                    }}
                >
                    {isArray(availableFoodTrucks) &&
                        availableFoodTrucks.map((foodTruck) => (
                            <VehicleMarker
                                key={foodTruck.id}
                                vehicle={new Vehicle(foodTruck.vehicle, fleetbaseAdapter)}
                                onPress={() => handlePressFoodTruck(foodTruck)}
                                mapBearing={bearing}
                                providerIsGoogle={Platform.OS === 'android' || PROVIDER_DEFAULT === PROVIDER_GOOGLE}
                                onMovement={({ coordinates, heading }) => {
                                    focusMoving(coordinates, { heading });
                                }}
                            >
                                <YStack opacity={0.9} mt='$2' bg='$background' borderRadius='$6' px='$2' py='$1' alignItems='center' justifyContent='center'>
                                    <Text fontSize={14} color='$textPrimary' numberOfLines={1}>
                                        {t('FoodTruckScreen.truck')} {foodTruck.vehicle?.plate_number}
                                    </Text>
                                </YStack>
                            </VehicleMarker>
                        ))}
                    {currentLocation && (
                        <Marker
                            coordinate={makeCoordinatesFloat({ latitude: currentLocationCoordinates[0], longitude: currentLocationCoordinates[1] })}
                            onPress={() => handlePressCurrentLocation(currentLocation)}
                        >
                            <YStack alignItems='center' justifyContent='center'>
                                <YStack bg='$blue-600' padding='$2' alignItems='center' justifyContent='center' borderRadius='$4'>
                                    <FontAwesomeIcon icon={faHome} color={theme['$blue-100'].val} size={25} />
                                </YStack>
                                <YStack opacity={1} mt='$2' bg='$blue-600' borderRadius='$6' px='$2' py='$1' alignItems='center' justifyContent='center' maxWidth={180}>
                                    <Text fontSize={14} color='$blue-100' numberOfLines={1}>
                                        {currentLocation
                                            ? currentLocation.isAttributeFilled('name')
                                                ? currentLocation.getAttribute('name')
                                                : formattedAddressFromPlace(currentLocation)
                                            : t('common.loading')}
                                    </Text>
                                </YStack>
                            </YStack>
                        </Marker>
                    )}
                    {!isNone(currentZone) && (
                        <Polygon
                            coordinates={makeCoordinatesFloat(getPolygonCoordinates(currentZone.border))}
                            strokeWidth={2}
                            strokeColor={currentZone.stroke_color}
                            fillColor={hexToRGBA(currentZone.color, 0.05)}
                            lineDashPattern={[5, 5]}
                        />
                    )}
                </MapView>
            )}

            {/* ── Top overlay: header + zone info banner ── */}
            <YStack position='absolute' top={0} left={0} right={0} zIndex={10}>
                <CustomHeader
                    headerRowProps={{ px: '$4' }}
                    headerLeftStyle={{ maxWidth: isAndroid ? screenWidth * 0.4 : screenWidth * 0.5 }}
                    headerTransparent={true}
                    headerShadowVisible={false}
                    headerLeft={
                        <LocationPicker onPressAddNewLocation={({ navigation, params }) => handleNavigateNewLocation(navigation, params)} redirectToAfterAddLocation={'FoodTruckHome'} />
                    }
                    headerRight={
                        <XStack space='$4' alignItems='center'>
                            <CartButton onPress={({ navigation }) => navigation.navigate('CartModal')} />
                            <LocaleButton blur={true} />
                        </XStack>
                    }
                />
                <YStack px='$4'>
                    <YStack bg='$background' borderRadius='$5'>
                        <XStack alignItems='center' py='$4' px='$4' borderBottomWidth={1} borderColor='$borderColor'>
                            <YStack width={32}>
                                <FontAwesomeIcon icon={faCircleInfo} color={infoColor} size={20} />
                            </YStack>
                            <XStack flex={1}>
                                <Text color={infoColor} fontSize={15} numberOfLines={2}>
                                    {t('FoodTruckScreen.tapTrucksPrompt')}
                                </Text>
                            </XStack>
                        </XStack>
                        <Pressable onPress={handlePressCurrentZone}>
                            <XStack py='$4' px='$4'>
                                <YStack width={32}>
                                    <FontAwesomeIcon icon={faMapLocationDot} color={currentZoneColor} size={20} />
                                </YStack>
                                <YStack flex={1}>
                                    <Text color={currentZoneColor} fontSize={15} numberOfLines={2}>
                                        {currentZone ? `${t('FoodTruckScreen.yourZoneIs')}: ` : t('FoodTruckScreen.outOfZone')}
                                    </Text>
                                    {currentZone && (
                                        <Text fontWeight='bold' color={currentZoneColor} fontSize={15} numberOfLines={1}>
                                            {currentZone.name}
                                        </Text>
                                    )}
                                </YStack>
                            </XStack>
                        </Pressable>
                    </YStack>
                </YStack>
            </YStack>

            {/* ── Bottom overlay: horizontal food truck scroll strip ──
                Positioned above the tab bar using safe area insets so it
                never overlaps the navigation bar on any device. The outer
                YStack uses pointerEvents="box-none" so that touches in the
                empty space around the cards fall through to the MapView,
                keeping map pan/zoom fully functional.
            */}
            {isArray(availableFoodTrucks) && availableFoodTrucks.length > 0 && (
                <View
                    style={[styles.horizontalScrollContainer, { bottom: horizontalScrollBottom }]}
                    pointerEvents='box-none'
                >
                    <FlatList
                        data={availableFoodTrucks}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id}
                        renderItem={renderFoodTruckCard}
                        contentContainerStyle={styles.horizontalScrollContent}
                        // Prevent the FlatList's internal scroll gesture from
                        // being swallowed by the parent MapView on Android.
                        nestedScrollEnabled={true}
                    />
                </View>
            )}
        </YStack>
    );
};

const styles = StyleSheet.create({
    horizontalScrollContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 10,
    },
    horizontalScrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    truckCardImage: {
        width: 64,
        height: 64,
    },
});

export default FoodTruckScreen;
