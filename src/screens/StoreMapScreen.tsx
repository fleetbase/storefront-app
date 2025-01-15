import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import { YStack, Image } from 'tamagui';
import { restoreFleetbasePlace, getPlaceCoords } from '../utils/location';
import { listen } from '../utils/socket';
import { storefrontConfig } from '../utils';
import useFleetbase from '../hooks/use-fleetbase';
import DriverMarker from '../components/DriverMarker';
import useStoreLocations from '../hooks/use-store-locations';
import FastImage from 'react-native-fast-image';

const StoreMapScreen = ({ route }) => {
    const { fleetbase } = useFleetbase();
    const { store, currentStoreLocation, storeLocations } = useStoreLocations();
    const initialLocation = restoreFleetbasePlace(currentStoreLocation.getAttribute('place'));
    const initialCoordinates = getPlaceCoords(initialLocation);
    const [mapRegion, setMapRegion] = useState({
        ...initialCoordinates,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });
    const [drivers, setDrivers] = useState([]);
    const storeLocationCoordinates = storeLocations.map((storeLocation) => getPlaceCoords(restoreFleetbasePlace(storeLocation.getAttribute('place'))));

    useEffect(() => {
        if (!fleetbase) {
            return;
        }

        const loadDrivers = async () => {
            try {
                const drivers = await fleetbase.drivers.findAll();
                setDrivers(drivers);
            } catch (err) {
                console.error('Error loading drivers:', err);
            }
        };

        loadDrivers();
    }, [fleetbase]);

    return (
        <YStack flex={1} alignItems='center' justifyContent='center' bg='$surface' width='100%' height='100%'>
            <MapView style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }} initialRegion={mapRegion}>
                {storefrontConfig('showDriversOnMap', false) && drivers.map((driver) => <DriverMarker key={driver.id} driver={driver} />)}
                {storeLocationCoordinates.map((storeLocationCoords, index) => (
                    <Marker key={index} coordinate={storeLocationCoords}>
                        <YStack borderWidth={2} borderColor='$white' borderRadius='$3'>
                            <FastImage
                                source={{ uri: store.getAttribute('logo_url') }}
                                style={{
                                    height: 45,
                                    width: 45,
                                }}
                            />
                        </YStack>
                    </Marker>
                ))}
            </MapView>
        </YStack>
    );
};

export default StoreMapScreen;
