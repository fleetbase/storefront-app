import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, Keyboard, Pressable, ScrollView } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faTimes, faCircleXmark, faLocationArrow, faMapLocation, faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { Input, View, Button, Text, YStack, useTheme, XStack, AnimatePresence, Circle } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { geocodeAutocomplete, getPlaceDetails, createFleetbasePlaceFromDetails, formattedAddressFromPlace } from '../utils/location';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from '../utils/toast';
import useStorage from '../hooks/use-storage';
import useCurrentLocation from '../hooks/use-current-location';
import BackButton from '../components/BackButton';

const AddNewLocationScreen = ({ route }) => {
    const params = route.params || {};
    const navigation = useNavigation();
    const theme = useTheme();
    const { t } = useLanguage();
    const { liveLocation: currentLocation, getCurrentLocationCoordinates } = useCurrentLocation();
    const [inputFocused, setInputFocused] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const searchInput = useRef(null);

    const handleFocus = () => setInputFocused(true);
    const handleBlur = () => setInputFocused(false);
    const handleClearInput = () => setInputValue('');
    const handleDismissFocus = () => {
        setInputFocused(false);
        Keyboard.dismiss();
        searchInput.current.blur();
    };

    const handleLocationSelect = async (location) => {
        try {
            const details = await getPlaceDetails(location.place_id);
            const place = createFleetbasePlaceFromDetails(details);
            navigation.navigate('EditLocation', { place: place.serialize(), redirectTo: params.redirectTo });
        } catch (error) {
            console.error('Error selecting location:', error);
            toast.error(error.message);
        }
    };

    const handleUseCurrentLocation = async () => {
        try {
            navigation.navigate('EditLocation', { place: currentLocation.serialize(), redirectTo: params.redirectTo });
        } catch (error) {
            console.error('Error selecting current location:', error);
            toast.error(error.message);
        }
    };

    const handleUseMapLocation = () => {
        navigation.navigate('LocationPicker', { redirectTo: params.redirectTo });
    };

    const searchPlaces = useCallback(async () => {
        if (inputValue.trim() === '') {
            setSearchResults([]);
            return;
        }

        const coordinates = getCurrentLocationCoordinates();
        const results = await geocodeAutocomplete(inputValue, coordinates);
        setSearchResults(results);
    }, [inputValue]);

    // Debounce the searchPlaces function
    useEffect(() => {
        const debounceTimeout = setTimeout(() => {
            searchPlaces();
        }, 500);

        return () => clearTimeout(debounceTimeout); // Clear timeout on cleanup
    }, [inputValue, searchPlaces]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack bg='$background' width='100%' height='100%' padding='$4' space='$5'>
                <YStack
                    space='$3'
                    animation='quick'
                    opacity={inputFocused ? 0 : 1}
                    style={{
                        transform: [{ scale: inputFocused ? 0.5 : 1 }],
                        transition: 'opacity 0.3s, transform 0.3s',
                    }}
                >
                    <BackButton onPress={() => navigation.goBack()} />

                    <Text fontSize={25} fontWeight={800} color='$color'>
                        {t('AddNewLocationScreen.addNewAddress')}
                    </Text>
                </YStack>

                <YStack justifyContent='flex-start'>
                    <AnimatePresence>
                        <XStack
                            animation='quick'
                            justifyContent='center'
                            alignItems='center'
                            width='100%'
                            position='absolute'
                            top={inputFocused ? 0 : 'auto'}
                            left={0}
                            right={0}
                            bg={inputFocused ? '$borderColor' : '$surface'}
                            borderRadius='$3'
                            borderWidth={2}
                            borderColor='$borderColor'
                            style={{
                                transform: [{ translateY: inputFocused ? -120 : 0 }],
                                elevation: inputFocused ? 4 : 0,
                            }}
                        >
                            {inputFocused && (
                                <Button size={40} onPress={handleDismissFocus} bg='transparent' animation='quick'>
                                    <Button.Icon>
                                        <FontAwesomeIcon icon={faArrowLeft} color={theme.color.val} />
                                    </Button.Icon>
                                </Button>
                            )}
                            <Input
                                ref={searchInput}
                                size='$5'
                                placeholder={t('AddNewLocationScreen.streetName')}
                                bg='transparent'
                                color='$color'
                                flex={1}
                                borderWidth={0}
                                paddingHorizontal='$2'
                                shadowOpacity={0}
                                shadowRadius={0}
                                value={inputValue}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                onChangeText={setInputValue}
                                autoCapitalize='none'
                                autoComplete='off'
                                autoCorrect={false}
                            />
                            {inputFocused && (
                                <Button size={40} onPress={handleClearInput} bg='transparent' animation='quick'>
                                    <Button.Icon>
                                        <FontAwesomeIcon icon={faCircleXmark} color={theme.color.val} />
                                    </Button.Icon>
                                </Button>
                            )}
                        </XStack>
                    </AnimatePresence>

                    <YStack
                        animation='quick'
                        bg='$borderColor'
                        borderWidth={2}
                        borderColor='$borderColor'
                        borderRadius='$3'
                        height={150}
                        opacity={inputFocused ? 1 : 0}
                        style={{
                            transform: [{ translateY: inputFocused ? -50 : 0 }],
                            elevation: 4,
                        }}
                    >
                        <ScrollView showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps='handled' style={{ height: 150 }}>
                            {currentLocation && searchResults.length === 0 && (
                                <Pressable onPress={handleUseCurrentLocation}>
                                    <XStack space='$2' borderBottomWidth={1} borderColor='$borderColorWithShadow' padding='$3'>
                                        <YStack justifyContent='center' alignItems='center' paddingHorizontal='$1'>
                                            <Circle size={40} bg='$background'>
                                                <FontAwesomeIcon icon={faLocationArrow} color={theme.textPrimary.val} />
                                            </Circle>
                                        </YStack>
                                        <YStack flex={1} space='$1'>
                                            <Text color='$text' fontSize={15} fontWeight='800' numberOfLines={1}>
                                                {formattedAddressFromPlace(currentLocation)}
                                            </Text>
                                            <Text color='$textSecondary' numberOfLines={1}>
                                                {t('AddNewLocationScreen.weThinkYoureAroundHere')}
                                            </Text>
                                        </YStack>
                                    </XStack>
                                </Pressable>
                            )}
                            {searchResults.length > 0 &&
                                searchResults.map((location) => (
                                    <Pressable onPress={() => handleLocationSelect(location)} key={location.place_id}>
                                        <XStack animation='quick' space='$2' borderBottomWidth={1} borderColor='$borderColorWithShadow' padding='$3'>
                                            <YStack justifyContent='center' alignItems='center' paddingHorizontal='$1'>
                                                <Circle size={40} bg='$background'>
                                                    <FontAwesomeIcon icon={faLocationDot} color={theme.textPrimary.val} />
                                                </Circle>
                                            </YStack>
                                            <YStack flex={1} space='$1'>
                                                <Text color='$text' fontSize={15} fontWeight='800' numberOfLines={1}>
                                                    {location.description}
                                                </Text>
                                                <Text color='$textSecondary' numberOfLines={1}>
                                                    {[location.city, location.state, location.country].filter(Boolean).join(', ')}
                                                </Text>
                                            </YStack>
                                        </XStack>
                                    </Pressable>
                                ))}
                            <Pressable onPress={handleUseMapLocation}>
                                <XStack space='$2' borderBottomWidth={1} borderColor='$borderColorWithShadow' padding='$3'>
                                    <YStack justifyContent='center' alignItems='center' paddingHorizontal='$1'>
                                        <Circle size={40} bg='$background'>
                                            <FontAwesomeIcon icon={faMapLocation} color={theme.textPrimary.val} />
                                        </Circle>
                                    </YStack>
                                    <YStack flex={1} space='$1'>
                                        <Text color='$text' fontSize={15} fontWeight='800' numberOfLines={1}>
                                            {t('AddNewLocationScreen.cantFindYourAddress')}
                                        </Text>
                                        <Text color='$textSecondary' numberOfLines={1}>
                                            {t('AddNewLocationScreen.useMapInstead')}
                                        </Text>
                                    </YStack>
                                </XStack>
                            </Pressable>
                        </ScrollView>
                    </YStack>
                </YStack>

                <YStack flex={1} position='relative' width='100%'>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleDismissFocus} pointerEvents='box-only' />
                </YStack>
            </YStack>
        </SafeAreaView>
    );
};

export default AddNewLocationScreen;
