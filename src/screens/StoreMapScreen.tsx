import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import { YStack, Image } from 'tamagui';
import { restoreFleetbasePlace, getCoordinatesObject, makeCoordinatesFloat } from '../utils/location';
import { listen } from '../utils/socket';
import { storefrontConfig } from '../utils';
import useFleetbase from '../hooks/use-fleetbase';
import DriverMarker from '../components/DriverMarker';
import useStoreLocations from '../hooks/use-store-locations';
import FastImage from 'react-native-fast-image';

const StoreMapScreen = ({ route }) => {
    const navigation = useNavigation();
    const { fleetbase } = useFleetbase();
    const { store, currentStoreLocation, storeLocations } = useStoreLocations();
    const initialLocation = restoreFleetbasePlace(currentStoreLocation.getAttribute('place'));
    const initialCoordinates = getCoordinatesObject(initialLocation);
    const [mapRegion, setMapRegion] = useState({
        ...initialCoordinates,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });
    const [drivers, setDrivers] = useState([]);
    const locations = useMemo(() => {
        return storeLocations.map((storeLocation) => {
            return {
                ...storeLocation.serialize(),
                coords: getCoordinatesObject(restoreFleetbasePlace(storeLocation.getAttribute('place'))),
            };
        });
    }, [storeLocations]);

    const viewStore = (store, storeLocation) => {
        navigation.navigate('StoreInfo', { store: store.serialize(), storeLocation });
    };

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
            <MapView style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }} initialRegion={mapRegion} mapType={storefrontConfig('defaultMapType', 'standard')}>
                {storefrontConfig('showDriversOnMap', false) && drivers.map((driver) => <DriverMarker key={driver.id} driver={driver} />)}
                {locations.map((location, index) => (
                    <Marker key={index} coordinate={makeCoordinatesFloat(location.coords)} onPress={() => viewStore(store, location)}>
                        <YStack borderWidth={2} borderColor='$white' borderRadius='$3'>
                            <FastImage
                                source={{ uri: store.getAttribute('logo_url') }}
                                style={{
                                    height: 50,
                                    width: 50,
                                    borderRadius: 8,
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
