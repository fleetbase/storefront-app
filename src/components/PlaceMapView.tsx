import React, { useState, useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { YStack, useTheme } from 'tamagui';
import { restoreFleetbasePlace, getCoordinates } from '../utils/location';
import { storefrontConfig } from '../utils';
import LocationMarker from './LocationMarker';

// Utility to calculate deltas from zoom
const calculateDeltas = (zoom) => {
    const baseDelta = 0.005;
    return baseDelta * zoom;
};

const PlaceMapView = ({ place: _place, width = '100%', height = 200, markerSize = 'md', zoom = 1, onPress, mapViewProps = {}, ...props }) => {
    const place = restoreFleetbasePlace(_place);
    const [latitude, longitude] = getCoordinates(place);
    const initialDeltas = calculateDeltas(zoom);
    const [mapRegion, setMapRegion] = useState({
        latitude,
        longitude,
        latitudeDelta: initialDeltas,
        longitudeDelta: initialDeltas,
    });
    const mapRef = useRef(null);

    useEffect(() => {
        const newDeltas = calculateDeltas(zoom);
        setMapRegion((prevRegion) => ({
            ...prevRegion,
            latitudeDelta: newDeltas,
            longitudeDelta: newDeltas,
        }));
    }, [zoom]);

    useEffect(() => {
        mapRef.current.animateToRegion(
            {
                latitude,
                longitude,
                latitudeDelta: 0.0008,
                longitudeDelta: 0.0008,
            },
            500
        );
    }, [latitude, longitude]);

    return (
        <Pressable onPress={onPress} style={{ flex: 1 }}>
            <YStack flex={1} position='relative' overflow='hidden' borderRadius='$4' width={width} height={height} {...props}>
                <MapView
                    ref={mapRef}
                    style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }}
                    initialRegion={mapRegion}
                    onRegionChangeComplete={(region) => setMapRegion(region)}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                    mapType={storefrontConfig('defaultMapType', 'standard')}
                    {...mapViewProps}
                >
                    <Marker coordinate={{ latitude, longitude }}>
                        <LocationMarker size={markerSize} />
                    </Marker>
                </MapView>
            </YStack>
        </Pressable>
    );
};

export default PlaceMapView;
