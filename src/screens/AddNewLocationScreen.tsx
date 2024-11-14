import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SafeAreaView, TouchableWithoutFeedback, Keyboard, TouchableOpacity, ScrollView } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faTimes, faCircleXmark, faLocationArrow, faMapLocation, faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { Input, View, Button, Text, YStack, useTheme, XStack, AnimatePresence, Circle } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { geocodeAutocomplete, getCurrentLocation, getLocationName } from '../utils/location';
import useStorage from '../hooks/use-storage';
import BackButton from '../components/BackButton';

const AddNewLocationScreen = () => {
    const navigation = useNavigation();
    const theme = useTheme();
    const [currentLocation, setCurrentLocation] = useState({});
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

    useEffect(() => {
        const initializeLocation = async () => {
            const location = await getCurrentLocation();
            if (location) {
                setCurrentLocation({
                    id: 'default',
                    name: getLocationName(location),
                    coordinates: location.coordinates,
                });
            }
        };

        initializeLocation();
    }, []);

    const searchPlaces = useCallback(async () => {
        if (inputValue.trim() === '') {
            setSearchResults([]);
            return;
        }

        console.log('Searching Places...');
        const results = await geocodeAutocomplete(inputValue, currentLocation ? currentLocation.coordinates : null);
        console.log('searchPlaces results', results);
        setSearchResults(results);
    }, [inputValue]);

    // Debounce the searchPlaces function
    useEffect(() => {
        const debounceTimeout = setTimeout(() => {
            searchPlaces();
        }, 500); // Adjust delay as necessary

        return () => clearTimeout(debounceTimeout); // Clear timeout on cleanup
    }, [inputValue, searchPlaces]);

    return (
        <TouchableWithoutFeedback onPress={handleDismissFocus}>
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
                            Add new address
                        </Text>
                    </YStack>

                    <YStack flex={1} justifyContent='flex-start'>
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
                                    placeholder='Street name and number'
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
                            <ScrollView style={{ height: 150 }}>
                                {currentLocation && searchResults.length === 0 && (
                                    <TouchableOpacity>
                                        <XStack space='$2' borderBottomWidth={1} borderColor='$borderColorWithShadow' padding='$3'>
                                            <YStack justifyContent='center' alignItems='center' paddingHorizontal='$1'>
                                                <Circle size={40} bg='$background'>
                                                    <FontAwesomeIcon icon={faLocationArrow} />
                                                </Circle>
                                            </YStack>
                                            <YStack flex={1} space='$1'>
                                                <Text fontColor='$text' fontSize={15} fontWeight='800' numberOfLines={1}>
                                                    {currentLocation.name}
                                                </Text>
                                                <Text fontColor='$textSecondary' numberOfLines={1}>
                                                    We think you're around here
                                                </Text>
                                            </YStack>
                                        </XStack>
                                    </TouchableOpacity>
                                )}
                                {searchResults.length > 0 &&
                                    searchResults.map((location) => (
                                        <TouchableOpacity key={location.place_id}>
                                            <XStack animation='quick' space='$2' borderBottomWidth={1} borderColor='$borderColorWithShadow' padding='$3'>
                                                <YStack justifyContent='center' alignItems='center' paddingHorizontal='$1'>
                                                    <Circle size={40} bg='$background'>
                                                        <FontAwesomeIcon icon={faLocationDot} />
                                                    </Circle>
                                                </YStack>
                                                <YStack flex={1} space='$1'>
                                                    <Text fontColor='$text' fontSize={15} fontWeight='800' numberOfLines={1}>
                                                        {location.description}
                                                    </Text>
                                                    <Text fontColor='$textSecondary' numberOfLines={1}>
                                                        Testing
                                                    </Text>
                                                </YStack>
                                            </XStack>
                                        </TouchableOpacity>
                                    ))}
                                <TouchableOpacity onPress={() => navigation.navigate('LocationPicker')}>
                                    <XStack space='$2' borderBottomWidth={1} borderColor='$borderColorWithShadow' padding='$3'>
                                        <YStack justifyContent='center' alignItems='center' paddingHorizontal='$1'>
                                            <Circle size={40} bg='$background'>
                                                <FontAwesomeIcon icon={faMapLocation} />
                                            </Circle>
                                        </YStack>
                                        <YStack flex={1} space='$1'>
                                            <Text fontColor='$text' fontSize={15} fontWeight='800' numberOfLines={1}>
                                                Can't find your address?
                                            </Text>
                                            <Text fontColor='$textSecondary' numberOfLines={1}>
                                                Use a map to do this instead
                                            </Text>
                                        </YStack>
                                    </XStack>
                                </TouchableOpacity>
                            </ScrollView>
                        </YStack>
                    </YStack>
                </YStack>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

export default AddNewLocationScreen;
