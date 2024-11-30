import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView, Keyboard, Animated, StyleSheet } from 'react-native';
import { Spinner, Button, Stack, Text, YStack, XStack, Input, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMagnifyingGlass, faArrowLeft, faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StoreTagCloud from '../components/StoreTagCloud';
import ProductCard from '../components/ProductCard';
import useStorefrontInfo from '../hooks/use-storefront-info';
import useStorefront from '../hooks/use-storefront';
import { debounce, delay } from '../utils';
import { pluralize } from 'inflected';

const StoreSearch = (route = {}) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { info } = useStorefrontInfo();
    const { storefront } = useStorefront();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [inputFocused, setInputFocused] = useState(false);
    const [tagCloudHeight, setTagCloudHeight] = useState('auto');
    const searchInput = useRef(null);

    // Animated values for the tag cloud
    const tagCloudTranslateY = useRef(new Animated.Value(0)).current;
    const tagCloudOpacity = useRef(new Animated.Value(1)).current;

    // Debounced search function
    const performSearch = debounce(async (query) => {
        if (!query.trim()) {
            setResults([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const results = await storefront.search(query, { store: info.id });
            setResults(results);
        } catch (error) {
            console.error('Error searching:', error);
        } finally {
            setIsLoading(false);
        }
    }, 300);

    const setTag = (tag) => {
        setSearchQuery(tag);
        handleFocus();
        if (searchInput.current && typeof searchInput.current.focus === 'function') {
            searchInput.current.focus();
        }
    };

    const handleFocus = () => {
        setInputFocused(true);
        // Animate tag cloud away
        Animated.parallel([
            Animated.timing(tagCloudTranslateY, {
                toValue: -50, // Slide up
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(tagCloudOpacity, {
                toValue: 0, // Fade out
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleBlur = () => {
        setInputFocused(false);
        // Animate tag cloud back
        Animated.parallel([
            Animated.timing(tagCloudTranslateY, {
                toValue: 0, // Reset position
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(tagCloudOpacity, {
                toValue: 1, // Fade back in
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleClearInput = () => setSearchQuery('');

    const handleDismissFocus = () => {
        setInputFocused(false);
        Keyboard.dismiss();
        if (searchInput.current && typeof searchInput.current.blur === 'function') {
            searchInput.current.blur();
        }
    };

    useEffect(() => {
        performSearch(searchQuery);
    }, [searchQuery]);

    return (
        <YStack flex={1} bg='$background'>
            <XStack
                bg='$surface'
                paddingTop={insets.top}
                paddingHorizontal='$4'
                paddingBottom='$4'
                shadowColor='$shadowColor'
                borderBottomWidth={1}
                borderColor='$borderColorWithShadow'
                shadowOffset={{ width: 0, height: 1 }}
                shadowOpacity={0.15}
                shadowRadius={3}
                zIndex={9}
            >
                <XStack
                    alignItems='center'
                    flex={1}
                    paddingHorizontal={0}
                    shadowOpacity={0}
                    shadowRadius={0}
                    borderWidth={1}
                    borderColor='$borderColorWithShadow'
                    borderRadius='$4'
                    bg='white'
                    shadowColor='$shadowColor'
                    shadowOffset={{ width: 0, height: 1 }}
                    shadowOpacity={0.15}
                    shadowRadius={3}
                >
                    <YStack>
                        {inputFocused ? (
                            <Button
                                onPress={handleDismissFocus}
                                bg='transparent'
                                width={40}
                                animation='quick'
                                hoverStyle={{
                                    scale: 0.75,
                                    opacity: 0.5,
                                }}
                                pressStyle={{
                                    scale: 0.75,
                                    opacity: 0.5,
                                }}
                            >
                                <Button.Icon>
                                    <FontAwesomeIcon icon={faArrowLeft} color={theme.color.val} size={18} />
                                </Button.Icon>
                            </Button>
                        ) : (
                            <YStack width={40} bg='transparent' animation='quick' alignItems='center' justifyContent='center'>
                                <FontAwesomeIcon icon={faMagnifyingGlass} color={theme.color.val} size={18} />
                            </YStack>
                        )}
                    </YStack>
                    <Input
                        ref={searchInput}
                        value={searchQuery}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onChangeText={setSearchQuery}
                        size='$4'
                        placeholder='Search products'
                        color='$color'
                        bg='transparent'
                        flex={1}
                        borderWidth={0}
                        autoCapitalize={false}
                        autoComplete={false}
                        autoCorrect={false}
                    />
                    {inputFocused && (
                        <Button
                            width={40}
                            onPress={handleClearInput}
                            bg='transparent'
                            animation='quick'
                            hoverStyle={{
                                scale: 0.75,
                                opacity: 0.5,
                            }}
                            pressStyle={{
                                scale: 0.75,
                                opacity: 0.5,
                            }}
                        >
                            <Button.Icon>
                                <FontAwesomeIcon icon={faCircleXmark} color={theme.color.val} size={18} />
                            </Button.Icon>
                        </Button>
                    )}
                </XStack>
            </XStack>
            <Animated.View
                style={{
                    transform: [{ translateY: tagCloudTranslateY }],
                    opacity: tagCloudOpacity,
                    position: 'absolute',
                    top: 125,
                }}
            >
                <YStack padding='$4'>
                    <StoreTagCloud tags={info.tags} maxTags={20} onTagPress={setTag} color='black' />
                </YStack>
            </Animated.View>
            {inputFocused && (
                <YStack flex={1}>
                    {isLoading ? (
                        <YStack flex={1} alignItems='center' justifyContent='center' position='absolute' style={StyleSheet.absoluteFillObject}>
                            <Spinner size='large' color={theme.primary.val} />
                        </YStack>
                    ) : results.length ? (
                        <YStack animate='quick' flex={1} padding='$3'>
                            <Text fontSize='$4' color='$textSecondary' marginTop='$2' marginBottom='$4'>
                                Found {results.length} {pluralize('result', results.length)} for "{searchQuery}"
                            </Text>
                            {results.map((result, index) => (
                                <ProductCard key={index} product={result} sliderHeight={135} style={{ width: 190 }} />
                            ))}
                        </YStack>
                    ) : searchQuery.trim() ? (
                        <YStack flex={1} alignItems='center' justifyContent='center' position='absolute' style={StyleSheet.absoluteFillObject}>
                            <Text fontSize='$6' color='$textSecondary' textAlign='center'>
                                No results found for "{searchQuery}"
                            </Text>
                        </YStack>
                    ) : (
                        <YStack flex={1} alignItems='center' justifyContent='center' position='absolute' style={StyleSheet.absoluteFillObject}>
                            <Text fontSize='$6' color='$textSecondary' textAlign='center'>
                                Search for products, categories, or more!
                            </Text>
                        </YStack>
                    )}
                </YStack>
            )}
        </YStack>
    );
};

export default StoreSearch;
