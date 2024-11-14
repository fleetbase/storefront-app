import React, { useEffect, useState, useRef } from 'react';
import { TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { View, Text, YStack, XStack, Stack, AnimatePresence } from 'tamagui';
import { Portal } from '@gorhom/portal';
import { BlurView } from '@react-native-community/blur';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import { getCurrentLocation, getLocationName } from '../utils/location';
import useStorefront from '../hooks/use-storefront';
import useStorage from '../hooks/use-storage';

const LocationPicker = ({ ...props }) => {
    const navigation = useNavigation();
    const { storefront, adapter } = useStorefront();
    const [currentLocation, setCurrentLocation] = useStorage('location');
    const [savedLocations, setSavedLocations] = useState([]);
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [triggerPosition, setTriggerPosition] = useState({ x: 28, y: 0, width: 0, height: 20 });
    const triggerRef = useRef(null);

    // Get screen width and calculate 75% of it
    const screenWidth = Dimensions.get('window').width;
    const dropdownWidth = screenWidth * 0.75;

    useEffect(() => {
        const initializeLocation = async () => {
            const locations = []; // Load locations with the adapter or other source

            if (locations.length > 0) {
                setSavedLocations(locations);
                setCurrentLocation(locations[0]);
            } else {
                const location = await getCurrentLocation();
                if (location) {
                    setCurrentLocation({
                        id: 'default',
                        name: getLocationName(location),
                        coordinates: location.coordinates,
                    });
                }
            }
        };

        initializeLocation();
    }, []);

    const toggleDropdown = () => {
        if (triggerRef.current) {
            triggerRef.current.measureInWindow((x, y, width, height) => {
                setTriggerPosition({ x, y, width, height });
            });
        }
        setDropdownOpen(!isDropdownOpen);
    };

    const handleLocationChange = (newLocation) => {
        setCurrentLocation(newLocation);
        setDropdownOpen(false);
    };

    const handleAddNewLocation = () => {
        navigation.navigate('AddNewLocationScreen');
        setDropdownOpen(false);
    };

    return (
        <YStack space='$3' {...props}>
            <TouchableOpacity
                ref={triggerRef}
                onPress={toggleDropdown}
                activeOpacity={0.7}
                style={{
                    backgroundColor: isDropdownOpen ? '$surface' : 'transparent',
                }}
            >
                <XStack alignItems='center' space='$2'>
                    <FontAwesomeIcon icon={faMapMarkerAlt} size={14} color='#4b5563' />
                    <Text
                        color='$primary'
                        fontWeight='bold'
                        fontSize='$5'
                        numberOfLines={1}
                        style={{
                            maxWidth: 200,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {currentLocation ? currentLocation.name : 'Loading...'}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#4b5563' }}>▼</Text>
                </XStack>
            </TouchableOpacity>

            <Portal hostName='LocationPickerPortal'>
                <AnimatePresence>
                    {isDropdownOpen && (
                        <Stack
                            borderRadius='$4'
                            borderWidth={1}
                            borderColor='$borderColorWithShadow'
                            shadowColor='$shadowColor'
                            shadowOffset={{ width: 0, height: 1 }}
                            shadowOpacity={0.15}
                            shadowRadius={3}
                            backgroundColor='transparent'
                            width={dropdownWidth}
                            position='absolute'
                            top={triggerPosition.height + 80}
                            left={triggerPosition.x - 15}
                            zIndex={1}
                            enterStyle={{
                                opacity: 0,
                                scale: 0.85,
                            }}
                            exitStyle={{
                                opacity: 0,
                                scale: 0.85,
                            }}
                            animation={{
                                opacity: { duration: 100 },
                                scale: {
                                    type: 'spring',
                                    damping: 18,
                                    stiffness: 400,
                                },
                            }}
                            originY={0}
                        >
                            <BlurView style={StyleSheet.absoluteFillObject} blurType='light' blurAmount={10} borderRadius={10} reducedTransparencyFallbackColor='rgba(255, 255, 255, 0.8)' />
                            <YStack space='$2' padding='$3' borderRadius='$4'>
                                {savedLocations.map((location) => (
                                    <TouchableOpacity
                                        key={location.id}
                                        onPress={() => handleLocationChange(location)}
                                        style={{
                                            paddingVertical: 6,
                                            paddingHorizontal: 8,
                                            borderBottomWidth: 1,
                                            borderBottomColor: '#d1d5db',
                                            backgroundColor: location.id === currentLocation?.id ? '$primary' : 'transparent',
                                        }}
                                    >
                                        <Text color={location.id === currentLocation?.id ? '$textSecondary' : '$textPrimary'}>{location.name}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                    onPress={handleAddNewLocation}
                                    style={{
                                        paddingVertical: 6,
                                        paddingHorizontal: 8,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: 'transparent',
                                    }}
                                >
                                    <FontAwesomeIcon icon={faPlus} size={16} style={{ marginRight: 6 }} />
                                    <Text color='$primaryColor'>Add New Location</Text>
                                </TouchableOpacity>
                            </YStack>
                        </Stack>
                    )}
                </AnimatePresence>
            </Portal>
        </YStack>
    );
};

export default LocationPicker;
