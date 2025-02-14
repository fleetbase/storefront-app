import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Input, View, Image, Button, Text, XStack, YStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapLocation, faLocationDot } from '@fortawesome/free-solid-svg-icons';
import BottomSheet, { BottomSheetView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Portal } from '@gorhom/portal';
import { Place } from '@fleetbase/sdk';
import { useNavigation } from '@react-navigation/native';
import {
    getDefaultCoordinates,
    geocode,
    createFleetbasePlaceFromDetails,
    getLocationFromRouteOrStorage,
    formattedAddressFromPlace,
    formatAddressSecondaryIdentifier,
    getCoordinates,
} from '../utils/location';
import { isArray, toBoolean, later, storefrontConfig } from '../utils';
import LocationMarker from '../components/LocationMarker';
import useStorefront from '../hooks/use-storefront';
import useCurrentLocation from '../hooks/use-current-location';

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
    const params = route.params || {};
    const navigation = useNavigation();
    const theme = useTheme();
    const { storefront } = useStorefront();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const initialLocation = getLocationFromRouteOrStorage('initialLocation', params);
    const [latitude, longitude] = getCoordinates(initialLocation);
    const [results, setResults] = useState([]);
    const [mapRegion, setMapRegion] = useState({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });
    const [isPanning, setIsPanning] = useState(false);
    const snapPoints = useMemo(() => ['35%', '50%', '65%'], []);
    const redirectTo = params.redirectTo;
    const redirectToScreen = params.redirectToScreen;
    const makeDefault = toBoolean(params.makeDefault);

    // Bottom sheet controls
    const openBottomSheet = () => {
        bottomSheetRef.current?.snapToPosition('35%');
    };

    const closeBottomSheet = () => {
        bottomSheetRef.current?.close();
    };

    // Handle panning tracking
    const handleTouchStart = () => setIsPanning(true);
    const handlePanDrag = () => setIsPanning(true);
    const handleTouchEnd = () => setIsPanning(false);

    // Function to handle region change and update the center location
    const handleRegionChangeComplete = (region) => {
        setIsPanning(false);
        setMapRegion(region);
        updateNearbyResults(region);
    };

    const updateNearbyResults = useCallback(
        async ({ latitude, longitude }) => {
            try {
                const results = await geocode(latitude, longitude, { withAllResults: true });
                if (isArray(results)) {
                    setResults(
                        results.map((result) => {
                            return createFleetbasePlaceFromDetails(result);
                        })
                    );

                    later(() => {
                        openBottomSheet();
                    }, 300);
                }
            } catch (error) {
                console.error('Error fetching nearby locations: ', error);
                toast.error(error.message);
            }
        },
        [setResults]
    );

    const handleLocationSelect = (place) => {
        closeBottomSheet();
        navigation.navigate('EditLocation', { place: place.serialize(), redirectTo, redirectToScreen, makeDefault });
    };

    const handleMarkerLocationSelect = () => {
        closeBottomSheet();
        const geocoded = results[0] ?? new Place();
        const place = new Place({
            location: [mapRegion.latitude, mapRegion.longitude],
            street1: geocoded.getAttribute('street1'),
            city: geocoded.getAttribute('city'),
            province: geocoded.getAttribute('province'),
            neighborhood: geocoded.getAttribute('neighborhood'),
            postal_code: geocoded.getAttribute('postal_code'),
            country: geocoded.getAttribute('country'),
        });
        navigation.navigate('EditLocation', { place: place.serialize(), redirectTo });
    };

    useEffect(() => {
        updateNearbyResults(mapRegion);

        return () => {
            closeBottomSheet();
        };
    }, []);

    return (
        <YStack flex={1} alignItems='center' justifyContent='center' bg='$surface' width='100%' height='100%'>
            <MapView
                style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }}
                onPress={handleTouchStart}
                onPanDrag={handlePanDrag}
                onRegionChangeComplete={handleRegionChangeComplete}
                initialRegion={mapRegion}
                mapType={storefrontConfig('defaultMapType', 'standard')}
            />
            <View style={styles.markerFixed}>
                <LocationMarker lifted={isPanning} />
            </View>
            <Portal hostName='MainPortal'>
                <BottomSheet
                    ref={bottomSheetRef}
                    index={-1}
                    snapPoints={snapPoints}
                    keyboardBehavior='extend'
                    keyboardBlurBehavior='none'
                    enableDynamicSizing={false}
                    enablePanDownToClose={true}
                    enableOverDrag={false}
                    style={{ flex: 1, width: '100%' }}
                    backgroundStyle={{ backgroundColor: theme.surface.val, borderWidth: 1, borderColor: theme.borderColorWithShadow.val }}
                    handleIndicatorStyle={{ backgroundColor: theme.secondary.val }}
                >
                    <BottomSheetView style={{ flex: 1 }}>
                        <YStack px='$3' py='$2'>
                            <Button
                                onPress={handleMarkerLocationSelect}
                                size='$4'
                                bg='$blue-100'
                                justifyContent='space-between'
                                space='$1'
                                mb='$3'
                                px='$4'
                                py='$3'
                                hoverStyle={{
                                    scale: 0.9,
                                    opacity: 0.5,
                                }}
                                pressStyle={{
                                    scale: 0.9,
                                    opacity: 0.5,
                                }}
                            >
                                <XStack space='$2'>
                                    <YStack pt='$1'>
                                        <FontAwesomeIcon icon={faLocationDot} color={theme.primary.val} size={20} />
                                    </YStack>
                                    <YStack>
                                        <Text color='$primary' fontWeight='bold' numberOfLines={1}>
                                            Use Marker Position
                                        </Text>
                                        <Text color='$blue-500'>Use exact marker position</Text>
                                    </YStack>
                                </XStack>
                            </Button>
                            <BottomSheetFlatList
                                data={results}
                                keyExtractor={(item, index) => index}
                                showsVerticalScrollIndicator={false}
                                showsHorizontalScrollIndicator={false}
                                renderItem={({ item }) => (
                                    <Button
                                        onPress={() => handleLocationSelect(item)}
                                        size='$4'
                                        bg='$secondary'
                                        justifyContent='space-between'
                                        space='$1'
                                        mb='$3'
                                        px='$4'
                                        py='$3'
                                        hoverStyle={{
                                            scale: 0.9,
                                            opacity: 0.5,
                                        }}
                                        pressStyle={{
                                            scale: 0.9,
                                            opacity: 0.5,
                                        }}
                                    >
                                        <YStack>
                                            <Text color='$textPrimary' fontWeight='bold' numberOfLines={1}>
                                                {formattedAddressFromPlace(item)}
                                            </Text>
                                            <Text color='$textSecondary'>{formatAddressSecondaryIdentifier(item)}</Text>
                                        </YStack>
                                    </Button>
                                )}
                            />
                            <YStack height={200} />
                        </YStack>
                    </BottomSheetView>
                </BottomSheet>
            </Portal>
        </YStack>
    );
};

export default LocationPickerScreen;
