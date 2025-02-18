import React, { useEffect, useState, useRef } from 'react';
import { Pressable, Dimensions, StyleSheet } from 'react-native';
import { View, Text, YStack, XStack, Stack, AnimatePresence, useTheme } from 'tamagui';
import { Portal } from '@gorhom/portal';
import { BlurView } from '@react-native-community/blur';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStore } from '@fortawesome/free-solid-svg-icons';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { formattedAddressFromSerializedPlace } from '../utils/location';
import storage from '../utils/storage';
import useStorefront from '../hooks/use-storefront';
import useStorage from '../hooks/use-storage';
import useStoreLocations from '../hooks/use-store-locations';
import useAppTheme from '../hooks/use-app-theme';
import useDimensions from '../hooks/use-dimensions';

const StoreLocationPicker = ({
    defaultStoreLocation = null,
    wrapperStyle = {},
    triggerWrapperStyle = {},
    triggerStyle = {},
    triggerTextStyle = {},
    triggerArrowStyle = {},
    triggerProps = {},
    ...props
}) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { isDarkMode } = useAppTheme();
    const { currentStoreLocation, storeLocations, updateCurrentStoreLocation } = useStoreLocations();
    const { screenWidth } = useDimensions();
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [triggerPosition, setTriggerPosition] = useState({ x: 28, y: 0, width: 0, height: 20 });
    const triggerRef = useRef(null);

    // Get the store location to display as the default
    const displayStoreLocation = defaultStoreLocation ? defaultStoreLocation : currentStoreLocation;

    // Get screen width and calculate 75% of it
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
        updateCurrentStoreLocation(newLocation);
        setDropdownOpen(false);
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
                        backgroundColor: isDropdownOpen ? '$surface' : 'transparent',
                    },
                    triggerWrapperStyle,
                ]}
            >
                <XStack alignItems='center' space='$2' style={triggerStyle} {...triggerProps}>
                    <FontAwesomeIcon icon={faStore} size={14} color={theme['$gray-300'].val} />
                    <Text
                        color='$gray-300'
                        fontWeight='bold'
                        fontSize='$5'
                        numberOfLines={1}
                        px='$1'
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
                        {displayStoreLocation
                            ? displayStoreLocation.isAttributeFilled('name')
                                ? displayStoreLocation.getAttribute('name')
                                : formattedAddressFromSerializedPlace(displayStoreLocation.getAttribute('place'))
                            : 'Loading...'}
                    </Text>
                    <Text style={[{ fontSize: 14, color: '#4b5563' }, triggerArrowStyle]}>▼</Text>
                </XStack>
            </Pressable>

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
                            overflow='hidden'
                            position='absolute'
                            top={triggerPosition.y - triggerPosition.height - 30}
                            left={triggerPosition.x - 20}
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
                                {storeLocations.map((location, index) => (
                                    <Pressable
                                        key={location.id ?? index}
                                        onPress={() => handleLocationChange(location)}
                                        style={{
                                            paddingVertical: 6,
                                            paddingHorizontal: 8,
                                            borderBottomWidth: storeLocations.length - 1 === index ? 0 : 1,
                                            borderBottomColor: theme.borderColorWithShadow.val,
                                        }}
                                    >
                                        <YStack mb='$1' bg={location.id === currentStoreLocation?.id ? '$primary' : 'transparent'} padding='$2' borderRadius='$3'>
                                            <Text color={location.id === currentStoreLocation?.id ? 'white' : '$textPrimary'} fontWeight='bold' mb='$1'>
                                                {location.getAttribute('name')}
                                            </Text>
                                            <Text color={location.id === currentStoreLocation?.id ? '$gray-200' : '$textSecondary'}>
                                                {formattedAddressFromSerializedPlace(location.getAttribute('place'))}
                                            </Text>
                                        </YStack>
                                    </Pressable>
                                ))}
                            </YStack>
                        </Stack>
                    )}
                </AnimatePresence>
            </Portal>
        </YStack>
    );
};

export default StoreLocationPicker;
