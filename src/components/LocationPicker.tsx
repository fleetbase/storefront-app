import React, { useEffect, useState, useRef } from 'react';
import { Pressable, Dimensions, StyleSheet } from 'react-native';
import { View, Text, YStack, XStack, Stack, AnimatePresence, useTheme } from 'tamagui';
import { Portal } from '@gorhom/portal';
import { BlurView } from '@react-native-community/blur';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { formattedAddressFromPlace } from '../utils/location';
import storage from '../utils/storage';
import useStorage from '../hooks/use-storage';
import useCurrentLocation from '../hooks/use-current-location';
import useSavedLocations from '../hooks/use-saved-locations';
import useAppTheme from '../hooks/use-app-theme';

const LocationPicker = ({
    onPressAddNewLocation,
    wrapperStyle = {},
    triggerWrapperStyle = {},
    triggerStyle = {},
    triggerTextStyle = {},
    triggerArrowStyle = {},
    triggerProps = {},
    redirectToAfterAddLocation = 'StoreHome',
    ...props
}) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { isDarkMode } = useAppTheme();
    const { currentLocation, isCurrentLocationLoading, updateCurrentLocation, setCustomerDefaultLocation } = useCurrentLocation();
    const { savedLocations } = useSavedLocations();
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [triggerPosition, setTriggerPosition] = useState({ x: 28, y: 0, width: 0, height: 20 });
    const triggerRef = useRef(null);

    // Get screen width and calculate 75% of it
    const screenWidth = Dimensions.get('window').width;
    const dropdownWidth = screenWidth * 0.75;

    const toggleDropdown = () => {
        if (triggerRef.current) {
            triggerRef.current.measureInWindow((x, y, width, height) => {
                setTriggerPosition({ x, y, width, height });
            });
        }
        setDropdownOpen(!isDropdownOpen);
    };

    const handleLocationChange = (newLocation) => {
        updateCurrentLocation(newLocation);
        setCustomerDefaultLocation(newLocation);
        setDropdownOpen(false);
    };

    const handleAddNewLocation = () => {
        setDropdownOpen(false);
        if (typeof onPressAddNewLocation === 'function') {
            onPressAddNewLocation(navigation, { redirectTo: redirectToAfterAddLocation });
        } else {
            navigation.navigate('AddNewLocationScreen', { redirectTo: redirectToAfterAddLocation });
        }
    };

    // Close dropdown when navigation state changes
    const navigationState = useNavigationState((state) => state);
    const prevNavigationStateRef = useRef(navigationState);

    useEffect(() => {
        if (prevNavigationStateRef.current !== navigationState) {
            // Navigation state has changed
            setDropdownOpen(false);
            prevNavigationStateRef.current = navigationState;
        }
    }, [navigationState]);

    return (
        <YStack space='$3' style={wrapperStyle} {...props}>
            <Pressable
                ref={triggerRef}
                onPress={toggleDropdown}
                activeOpacity={0.7}
                style={[
                    {
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: theme.borderColorWithShadow.val,
                        paddingHorizontal: 7,
                        paddingVertical: 5,
                    },
                    triggerWrapperStyle,
                ]}
            >
                <BlurView
                    style={StyleSheet.absoluteFillObject}
                    blurType={isDarkMode ? 'dark' : 'light'}
                    blurAmount={10}
                    borderRadius={10}
                    reducedTransparencyFallbackColor='rgba(255, 255, 255, 0.8)'
                />
                <XStack alignItems='center' space='$1' style={triggerStyle} {...triggerProps}>
                    <FontAwesomeIcon icon={faMapMarkerAlt} size={13} color={theme['$textPrimary'].val} />
                    <Text
                        color='$textPrimary'
                        fontWeight='bold'
                        fontSize='$4'
                        numberOfLines={1}
                        px='$1'
                        mr='$2'
                        style={[
                            {
                                maxWidth: 200,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            },
                            triggerTextStyle,
                        ]}
                    >
                        {currentLocation ? (currentLocation.isAttributeFilled('name') ? currentLocation.getAttribute('name') : formattedAddressFromPlace(currentLocation)) : 'Loading...'}
                    </Text>
                    <Text style={[{ fontSize: 14, color: theme.textPrimary.val, opacity: 0.35 }, triggerArrowStyle]}>▼</Text>
                </XStack>
            </Pressable>

            <Portal hostName='LocationPickerPortal'>
                <AnimatePresence>
                    {isDropdownOpen && (
                        <Stack
                            borderRadius={11}
                            borderWidth={1}
                            borderColor='$borderColorWithShadow'
                            shadowColor='$shadowColor'
                            shadowOffset={{ width: 0, height: 1 }}
                            shadowOpacity={0.15}
                            shadowRadius={3}
                            backgroundColor='transparent'
                            width={dropdownWidth}
                            position='absolute'
                            top={triggerPosition.height + 55}
                            left={triggerPosition.x - 10}
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
                            <BlurView
                                style={StyleSheet.absoluteFillObject}
                                blurType={isDarkMode ? 'dark' : 'light'}
                                blurAmount={10}
                                borderRadius={10}
                                reducedTransparencyFallbackColor='rgba(255, 255, 255, 0.8)'
                            />
                            <YStack space='$2' borderRadius='$4'>
                                {savedLocations.map((location, index) => (
                                    <Pressable
                                        key={location.id ?? index}
                                        onPress={() => handleLocationChange(location)}
                                        style={{
                                            paddingVertical: 6,
                                            paddingHorizontal: 8,
                                            borderBottomWidth: 1,
                                            borderBottomColor: theme.borderColor.val,
                                        }}
                                    >
                                        <YStack mb='$1' bg={location.id === currentLocation?.id ? '$primary' : 'transparent'} padding='$2' borderRadius='$3'>
                                            <Text color={location.id === currentLocation?.id ? 'white' : '$textPrimary'} fontWeight='bold' mb='$1'>
                                                {location.getAttribute('name')}
                                            </Text>
                                            <Text color={location.id === currentLocation?.id ? '$gray-200' : '$textSecondary'}>{formattedAddressFromPlace(location)}</Text>
                                        </YStack>
                                    </Pressable>
                                ))}
                                <Pressable
                                    onPress={handleAddNewLocation}
                                    style={{
                                        paddingVertical: 6,
                                        paddingHorizontal: 8,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: 'transparent',
                                    }}
                                >
                                    <XStack mb='$1' padding='$2'>
                                        <FontAwesomeIcon icon={faPlus} size={16} style={{ marginRight: 6 }} />
                                        <Text color='$primaryColor'>Add New Location</Text>
                                    </XStack>
                                </Pressable>
                            </YStack>
                        </Stack>
                    )}
                </AnimatePresence>
            </Portal>
        </YStack>
    );
};

export default LocationPicker;
