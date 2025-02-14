import React, { useState, useRef } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Spinner, Button, Text, XStack, YStack, useTheme } from 'tamagui';
import { Place, Point } from '@fleetbase/sdk';
import { useNavigation } from '@react-navigation/native';
import { restoreFleetbasePlace, getCoordinates } from '../utils/location';
import { storefrontConfig } from '../utils';
import LocationMarker from '../components/LocationMarker';
import AbsoluteTabBarScreenWrapper from '../components/AbsoluteTabBarScreenWrapper';
import useSavedLocations from '../hooks/use-saved-locations';
import usePromiseWithLoading from '../hooks/use-promise-with-loading';

const LOCATION_MARKER_SIZE = { height: 70, width: 40 };
const styles = StyleSheet.create({
    markerFixed: {
        position: 'absolute',
        top: Dimensions.get('window').height / 2 - LOCATION_MARKER_SIZE.height / 2,
        left: Dimensions.get('window').width / 2 - LOCATION_MARKER_SIZE.width / 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

const EditLocationCoordScreen = ({ route }) => {
    const params = route.params || {};
    const navigation = useNavigation();
    const theme = useTheme();
    const place = restoreFleetbasePlace({ ...params.place });
    const { updateLocationState } = useSavedLocations();
    const { runWithLoading, isLoading } = usePromiseWithLoading();
    const [latitude, longitude] = getCoordinates(place);
    const [results, setResults] = useState([]);
    const [mapRegion, setMapRegion] = useState({
        latitude,
        longitude,
        latitudeDelta: 0.0008,
        longitudeDelta: 0.0008,
    });
    const [isPanning, setIsPanning] = useState(false);
    const mapRef = useRef(null);
    const redirectTo = params.redirectTo;

    // Handle panning tracking
    const handleTouchStart = () => setIsPanning(true);
    const handlePanDrag = () => setIsPanning(true);
    const handleTouchEnd = () => setIsPanning(false);

    // Function to handle region change and update the center location
    const handleRegionChangeComplete = (region) => {
        setIsPanning(false);
        setMapRegion(region);
    };

    // Handle redirect
    const handleRedirect = () => {
        if (redirectTo === 'AddressBook') {
            navigation.reset({
                index: 2,
                routes: [{ name: 'Profile' }, { name: redirectTo }, { name: 'EditLocation', params: { place: place.serialize(), redirectTo } }],
            });
        } else {
            navigation.reset({
                index: 1,
                routes: [{ name: redirectTo }, { name: 'EditLocation', params: { place: place.serialize(), redirectTo } }],
            });
        }
    };

    // Save place
    const handleSave = async () => {
        if (place.isNew) {
            try {
                place.setAttribute('location', new Point(mapRegion.latitude, mapRegion.longitude));
                return handleRedirect();
            } catch (error) {
                console.log('Error saving address coordinates:', error);
                toast.error(error.message);
            }
        }

        try {
            const updatedPlace = await runWithLoading(place.update({ location: new Point(mapRegion.latitude, mapRegion.longitude) }));
            updateLocationState(updatedPlace);
            handleRedirect();
        } catch (error) {
            console.log('Error saving address coordinates:', error);
            toast.error(error.message);
        }
    };

    // Reset map to original place coordinates and animate marker as lifted
    const handleReset = () => {
        const [latitude, longitude] = getCoordinates(place);

        // Set marker to lifted
        setIsPanning(true);

        // Animate the map to the original location
        mapRef.current.animateToRegion(
            {
                latitude,
                longitude,
                latitudeDelta: 0.0008,
                longitudeDelta: 0.0008,
            },
            500 // Animation duration in milliseconds
        );

        // Update mapRegion state after animation
        setTimeout(() => {
            setIsPanning(false); // Reset marker lift
            setMapRegion({
                latitude,
                longitude,
                latitudeDelta: 0.0008,
                longitudeDelta: 0.0008,
            });
        }, 500); // Matches animation duration
    };

    return (
        <YStack flex={1} alignItems='center' justifyContent='center' bg='$surface' width='100%' height='100%'>
            <MapView
                ref={mapRef}
                style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }}
                onPress={handleTouchStart}
                onPanDrag={handlePanDrag}
                onRegionChangeComplete={handleRegionChangeComplete}
                mapType={storefrontConfig('defaultMapType', 'standard')}
                initialRegion={mapRegion}
            />
            <YStack style={styles.markerFixed}>
                <LocationMarker lifted={isPanning} />
            </YStack>
            <XStack animate='bouncy' position='absolute' bottom={0} left={0} right={0} zIndex={5}>
                <AbsoluteTabBarScreenWrapper>
                    <XStack padding='$4' space='$2'>
                        <Button onPress={handleSave} size='$5' bg='$success' borderColor='$successBorder' borderWidth={1} flex={1}>
                            <Button.Icon>{isLoading() && <Spinner color='$textSuccess' />}</Button.Icon>
                            <Button.Text color='$textSuccess' fontWeight='bold' fontSize='$5'>
                                Save Position
                            </Button.Text>
                        </Button>
                        <Button onPress={handleReset} size='$5' bg='$secondary' borderWidth={1} borderColor='$borderColor' flex={1}>
                            <Button.Text color='$textSecondary' fontWeight='bold' fontSize='$5'>
                                Reset
                            </Button.Text>
                        </Button>
                    </XStack>
                </AbsoluteTabBarScreenWrapper>
            </XStack>
        </YStack>
    );
};

export default EditLocationCoordScreen;
