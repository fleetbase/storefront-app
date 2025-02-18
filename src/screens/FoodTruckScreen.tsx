import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { StyleSheet, Pressable } from 'react-native';
import MapView, { Polygon, Marker } from 'react-native-maps';
import { XStack, YStack, Text, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapLocationDot, faTruck, faCircleInfo, faHome } from '@fortawesome/free-solid-svg-icons';
import { Vehicle } from '@fleetbase/sdk';
import { restoreFleetbasePlace, getCoordinates, getCoordinatesObject, isPointInGeoJSONPolygon, formattedAddressFromPlace, makeCoordinatesFloat } from '../utils/location';
import { storefrontConfig, isArray, isNone, hexToRGBA } from '../utils';
import useFleetbase from '../hooks/use-fleetbase';
import useStorefront from '../hooks/use-storefront';
import useStorage from '../hooks/use-storage';
import useAppTheme from '../hooks/use-app-theme';
import useCurrentLocation from '../hooks/use-current-location';
import VehicleMarker from '../components/VehicleMarker';

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
        return foodTruck.zone && foodTruck.zone.id === currentZone.id;
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

const FoodTruckScreen = () => {
    const navigation = useNavigation();
    const theme = useTheme();
    const headerHeight = useHeaderHeight();
    const { isDarkMode } = useAppTheme();
    const { fleetbase, adapter: fleetbaseAdapter } = useFleetbase();
    const { storefront } = useStorefront();
    const { currentLocation } = useCurrentLocation();
    const currentLocationCoordinates = getCoordinates(currentLocation);
    const [mapRegion, setMapRegion] = useState({
        latitude: currentLocationCoordinates[0],
        longitude: currentLocationCoordinates[1],
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });

    const mapRef = useRef(null);
    const [serviceArea, setServiceArea] = useStorage('service_area');
    const [zones, setZones] = useStorage('zones', []);
    const [foodTrucks, setFoodTrucks] = useStorage('food_trucks', []);
    const [currentZone, setCurrentZone] = useStorage('current_zone');
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
                const serializedFoodTrucks = foodTrucksResult.map((foodTruck) => foodTruck.serialize());
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
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, // Padding to keep it in view
                animated: true,
            });
        }
    };

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

    const currentZoneColor = currentZone ? theme[`$green-${isDarkMode ? '400' : '600'}`].val : theme[`$red-${isDarkMode ? '400' : '600'}`].val;
    const infoColor = isDarkMode ? theme['$blue-400'].val : theme['$blue-600'].val;

    return (
        <YStack flex={1} alignItems='center' justifyContent='center' bg='$surface' width='100%' height='100%'>
            <MapView
                ref={mapRef}
                style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', zIndex: 1 }}
                initialRegion={makeCoordinatesFloat(mapRegion)}
                mapType={storefrontConfig('defaultMapType', 'standard')}
            >
                {availableFoodTrucks.map((foodTruck) => (
                    <VehicleMarker key={foodTruck.id} vehicle={new Vehicle(foodTruck.vehicle, fleetbaseAdapter)} onPress={() => handlePressFoodTruck(foodTruck)}>
                        <YStack opacity={0.9} mt='$2' bg='$background' borderRadius='$6' px='$2' py='$1' alignItems='center' justifyContent='center'>
                            <Text fontSize={14} color='$textPrimary' numberOfLines={1}>
                                Truck {foodTruck.vehicle.plate_number}
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
                                        : 'Loading...'}
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
            <YStack position='absolute' top={0} left={0} right={0} zIndex={9} paddingTop={headerHeight} px='$4'>
                <YStack bg='$background' borderRadius='$5'>
                    <XStack alignItems='center' py='$4' px='$4' borderBottomWidth={1} borderColor='$borderColor'>
                        <YStack width={32}>
                            <FontAwesomeIcon icon={faCircleInfo} color={infoColor} size={20} />
                        </YStack>
                        <XStack flex={1}>
                            <Text color={infoColor} fontSize={15} numberOfLines={1}>
                                Tap trucks on the map to view products.
                            </Text>
                        </XStack>
                    </XStack>
                    <Pressable onPress={handlePressCurrentZone}>
                        <XStack py='$4' px='$4'>
                            <YStack width={32}>
                                <FontAwesomeIcon icon={faMapLocationDot} color={currentZoneColor} size={20} />
                            </YStack>
                            <YStack flex={1}>
                                <Text color={currentZoneColor} fontSize={15} numberOfLines={1}>
                                    {currentZone ? `Your zone is: ` : 'Out of zone, delivery unavailable 🙁'}
                                </Text>
                                {currentZone && (
                                    <Text fontWeight='bold' color={currentZoneColor} fontSize={15} numberOfLines={1}>
                                        {currentZone.name}
                                    </Text>
                                )}
                            </YStack>
                        </XStack>
                    </Pressable>
                    {availableFoodTrucks.map((foodTruck) => (
                        <Pressable key={foodTruck.id} onPress={() => handlePressFoodTruck(foodTruck)}>
                            <XStack py='$4' px='$4' alignItems='center' borderTopWidth={1} borderColor='$borderColor'>
                                <YStack width={32}>
                                    <FontAwesomeIcon icon={faTruck} color={theme['$textPrimary'].val} size={20} />
                                </YStack>
                                <XStack flex={1}>
                                    <Text color='$textPrimary' fontSize={15} numberOfLines={1}>
                                        Truck: {foodTruck.vehicle.plate_number}
                                    </Text>
                                </XStack>
                            </XStack>
                        </Pressable>
                    ))}
                </YStack>
            </YStack>
        </YStack>
    );
};

export default FoodTruckScreen;
