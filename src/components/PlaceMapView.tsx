import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { YStack, useTheme } from 'tamagui';
import { restoreFleetbasePlace, getCoordinates } from '../utils/location';

const PlaceMapView = ({ place: _place, height = 200, onPress, mapViewProps = {}, ...props }) => {
    const place = restoreFleetbasePlace(_place);
    const [latitude, longitude] = getCoordinates(place);
    const [mapRegion, setMapRegion] = useState({
        latitude,
        longitude,
        latitudeDelta: 0.0005,
        longitudeDelta: 0.0005,
    });

    return (
        <TouchableOpacity onPress={onPress}>
            <YStack flex={1} position='relative' overflow='hidden' width='100%' borderRadius='$4' height={height} {...props}>
                <MapView
                    style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }}
                    initialRegion={mapRegion}
                    onRegionChangeComplete={(region) => setMapRegion(region)}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                    {...mapViewProps}
                >
                    <Marker coordinate={{ latitude, longitude }} />
                </MapView>
            </YStack>
        </TouchableOpacity>
    );
};

export default PlaceMapView;
