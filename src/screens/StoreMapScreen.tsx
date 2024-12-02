import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { YStack } from 'tamagui';
import { getLocationFromRouteOrStorage } from '../utils/location';

const StoreMapScreen = ({ route }) => {
    const initialLocation = getLocationFromRouteOrStorage('initialLocation', route.params);
    const [mapRegion, setMapRegion] = useState({
        latitude: initialLocation?.getAttribute('location')[0] ?? 37.7749,
        longitude: initialLocation?.getAttribute('location')[1] ?? -122.4194,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });

    return (
        <YStack flex={1} alignItems='center' justifyContent='center' bg='$surface' width='100%' height='100%'>
            <MapView style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }} initialRegion={mapRegion} />
        </YStack>
    );
};

export default StoreMapScreen;
