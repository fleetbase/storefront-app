import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Pressable, StyleSheet, Platform } from 'react-native';
import { useHeaderHeight, getDefaultHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, YStack, XStack, Stack, AnimatePresence, useTheme } from 'tamagui';
import { Portal } from '@gorhom/portal';
import { BlurView } from '@react-native-community/blur';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import { formattedAddressFromPlace } from '../utils/location';
import useCurrentLocation from '../hooks/use-current-location';
import useSavedLocations from '../hooks/use-saved-locations';
import useAppTheme from '../hooks/use-app-theme';
import useDimensions from '../hooks/use-dimensions';
import { useLanguage } from '../contexts/LanguageContext';

const isAndroid = Platform.OS === 'android';
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
    const triggerRef = useRef();
    const { t } = useLanguage();
    const { isDarkMode } = useAppTheme();
    const { currentLocation, isCurrentLocationLoading, updateCurrentLocation, setCustomerDefaultLocation, initializeCurrentLocation } = useCurrentLocation();
    const { savedLocations } = useSavedLocations();
    const { screenWidth } = useDimensions();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [triggerPosition, setTriggerPosition] = useState({
        x: 0,
        y: 0,
    });
    const dropdownWidth = screenWidth * 0.75;

    const handleToggleDropdown = useCallback(() => {
        handleTriggerPoisition(() => {
            setIsDropdownOpen((prev) => !prev);
        });
    }, []);

    const handleTriggerPoisition = useCallback(
        (callback) => {
            if (!triggerRef.current) return;
            triggerRef.current.measureInWindow((x, y, width, height) => {
                setTriggerPosition({ x, y: y + height });
                if (typeof callback === 'function') {
                    callback();
                }
            });
        },
        [triggerRef.current]
    );

    const handleCloseDropdown = useCallback(() => {
        setIsDropdownOpen(false);
    }, []);

    const handleLocationChange = useCallback(
        (newLocation) => {
            updateCurrentLocation(newLocation);
            setCustomerDefaultLocation(newLocation);
            handleCloseDropdown();
        },
        [handleCloseDropdown, setCustomerDefaultLocation, updateCurrentLocation]
    );

    const handleAddNewLocation = useCallback(() => {
        handleCloseDropdown();

        if (typeof onPressAddNewLocation === 'function') {
            onPressAddNewLocation({
                navigation,
                params: { redirectTo: redirectToAfterAddLocation },
            });
        } else {
            navigation.navigate('AddNewLocationScreen', {
                redirectTo: redirectToAfterAddLocation,
            });
        }
    }, [handleCloseDropdown, navigation, onPressAddNewLocation, redirectToAfterAddLocation]);

    useEffect(() => {
        handleTriggerPoisition();
    }, [triggerRef.current]);

    return (
        <YStack style={wrapperStyle} {...props}>
            <Pressable
                ref={triggerRef}
                onPress={handleToggleDropdown}
                style={[
                    {
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: theme.borderColorWithShadow.val,
                        paddingHorizontal: 7,
                        paddingVertical: 5,
                        overflow: 'hidden',
                    },
                    triggerWrapperStyle,
                ]}
                {...triggerProps}
            >
                <BlurView
                    style={StyleSheet.absoluteFillObject}
                    blurType={isDarkMode ? 'dark' : 'light'}
                    blurAmount={10}
                    borderRadius={20}
                    reducedTransparencyFallbackColor='rgba(255, 255, 255, 0.8)'
                />
                <XStack alignItems='center' space='$1' style={triggerStyle}>
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
                        {currentLocation
                            ? currentLocation.isAttributeFilled?.('name')
                                ? currentLocation.getAttribute?.('name')
                                : formattedAddressFromPlace(currentLocation)
                            : t('common.loading')}
                    </Text>
                    <Text style={[{ fontSize: 14, color: theme.textPrimary.val, opacity: 0.35 }, triggerArrowStyle]}>▼</Text>
                </XStack>
            </Pressable>

            <Portal hostName='LocationPickerPortal'>
                <AnimatePresence>
                    {isDropdownOpen && (
                        <Stack position='absolute' top={0} bottom={0} left={0} right={0} zIndex={1} pointerEvents='box-none'>
                            <Pressable style={{ flex: 1, zIndex: 2 }} onPress={handleCloseDropdown} pointerEvents='auto' />
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
                                top={triggerPosition.y + 6}
                                left={triggerPosition.x}
                                zIndex={999}
                                pointerEvents='auto'
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
                                    {savedLocations.map((location, index) => {
                                        const isActive = location.id === currentLocation?.id;

                                        return (
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
                                                <YStack mb='$1' bg={isActive ? '$primary' : 'transparent'} padding='$2' borderRadius='$3'>
                                                    <Text color={isActive ? 'white' : '$textPrimary'} fontWeight='bold' mb='$1'>
                                                        {location.getAttribute('name')}
                                                    </Text>
                                                    <Text color={isActive ? '$gray-200' : '$textSecondary'}>{formattedAddressFromPlace(location)}</Text>
                                                </YStack>
                                            </Pressable>
                                        );
                                    })}

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
                                            <FontAwesomeIcon icon={faPlus} size={16} color={theme.textPrimary.val} style={{ marginRight: 6 }} />
                                            <Text color='$textPrimary'>{t('LocationPicker.addNewLocation')}</Text>
                                        </XStack>
                                    </Pressable>
                                </YStack>
                            </Stack>
                        </Stack>
                    )}
                </AnimatePresence>
            </Portal>
        </YStack>
    );
};

export default LocationPicker;
