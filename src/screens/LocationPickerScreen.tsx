import React, { useState, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Input, View, Image, Button, Text, YStack, useTheme } from 'tamagui';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import { getLocationFromRouteOrStorage } from '../utils/location';
import LocationMarker from '../components/LocationMarker';

const LOCATION_MARKER_SIZE = { height: 70, width: 40 };
const styles = StyleSheet.create({
    markerFixed: {
        position: 'absolute',
        top: Dimensions.get('window').height / 2 - LOCATION_MARKER_SIZE.height / 2,
        left: Dimensions.get('window').width / 2 - LOCATION_MARKER_SIZE.width / 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomSheetViewContainer: {
        flex: 1,
    },
});

const LocationPickerScreen = ({ route }) => {
    const { onLocationSelected } = route.params || {};
    const navigation = useNavigation();
    const theme = useTheme();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const initialLocation = getLocationFromRouteOrStorage('initialLocation', route.params || {});
    const [selectedLocation, setSelectedLocation] = useState(initialLocation || null);
    const [mapRegion, setMapRegion] = useState({
        latitude: initialLocation?.latitude || 37.7749,
        longitude: initialLocation?.longitude || -122.4194,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });
    const [isPanning, setIsPanning] = useState(false);
    const snapPoints = useMemo(() => [200, 400, 600], []);

    // Handle panning tracking
    const handleTouchStart = () => setIsPanning(true);
    const handlePanDrag = () => setIsPanning(true);
    const handleTouchEnd = () => setIsPanning(false);

    // Function to handle region change and update the center location
    const handleRegionChangeComplete = (region) => {
        setIsPanning(false);
        setMapRegion(region);
        console.log('Region changed', region);
        // Optionally perform geocoding here with region.latitude and region.longitude
    };

    const confirmLocation = () => {
        if (mapRegion) {
            const selected = {
                latitude: mapRegion.latitude,
                longitude: mapRegion.longitude,
            };
            onLocationSelected?.(selected);
            navigation.goBack(); // Go back to the previous screen
        }
    };

    const onLocationSelect = (event) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        setSelectedLocation({ latitude, longitude });
    };

    const onFocusSearchInput = ({ nativeEvent }) => {
        console.log('onFocusSearchInput', nativeEvent);
        bottomSheetRef.current.snapToIndex(2);
    };

    const handleSheetChanges = useCallback((index: number) => {
        console.log('handleSheetChanges', index);
    }, []);

    return (
        <YStack flex={1} alignItems='center' justifyContent='center' bg='$surface' width='100%' height='100%'>
            <MapView
                style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }}
                onPress={handleTouchStart}
                onPanDrag={handlePanDrag}
                onRegionChangeComplete={handleTouchEnd}
                initialRegion={mapRegion}
            >
                {selectedLocation && <Marker coordinate={selectedLocation} />}
            </MapView>
            <View style={styles.markerFixed}>
                <LocationMarker lifted={isPanning} />
            </View>
            {/* <BottomSheet
                ref={bottomSheetRef}
                snapPoints={snapPoints}
                enableDynamicSizing={false}
                onChange={handleSheetChanges}
                backgroundStyle={{ backgroundColor: theme.background.val }}
                handleStyle={{ backgroundColor: theme.background.val, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
                handleIndicatorStyle={{ backgroundColor: theme.borderColor.val }}
            >
                <BottomSheetView style={styles.bottomSheetViewContainer}>
                    <YStack flex={1} paddingHorizontal='$3' space='$2'>
                        <View paddingHorizontal='$1'>
                            <Text fontWeight={900} fontSize={20} color={theme.textSecondary.val}>
                                Add new address
                            </Text>
                        </View>
                        <View>
                            <Input
                                onFocus={onFocusSearchInput}
                                autoFocus={true}
                                size='$4'
                                borderWidth={2}
                                placeholder='Search for your address'
                                bg='$surface'
                                borderColor='$borderColor'
                                color='$color'
                            />
                        </View>
                    </YStack>
                </BottomSheetView>
            </BottomSheet> */}
        </YStack>
    );
};

export default LocationPickerScreen;
