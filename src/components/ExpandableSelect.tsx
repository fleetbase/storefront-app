import React, { useState, useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import { Spinner, XStack, YStack, Text, Button, Separator, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronUp, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { isNone } from '../utils';

const findSelectedOption = (options = [], value, optionValue) => {
    if (!isNone(value)) {
        return options.find((option) => {
            if (optionValue) {
                return option[optionValue] === value;
            }

            return option.id === value;
        });
    }
    return null;
};

const ExpandableSelect = ({ value, optionValue, options = [], onSelect }) => {
    const theme = useTheme();
    const [selectedOption, setSelectedOption] = useState(findSelectedOption(options, value, optionValue));
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [shouldRenderDropdown, setShouldRenderDropdown] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [optionAnimations, setOptionAnimations] = useState([]);
    const dropdownAnimation = useRef(new Animated.Value(0)).current;

    // Animated values for the dropdown toggle
    const toggleScale = useRef(new Animated.Value(selectedOption ? 1 : 0)).current;
    const toggleOpacity = useRef(new Animated.Value(selectedOption ? 1 : 0)).current;

    useEffect(() => {
        // Initialize optionAnimations when options change
        const animations = options.map(() => new Animated.Value(1));
        setOptionAnimations(animations);
    }, [options]);

    useEffect(() => {
        // Update selectedOption when value or options change
        if (value !== undefined && value !== null) {
            const newSelectedOption = findSelectedOption(options, value, optionValue);
            setSelectedOption(newSelectedOption);
        }
    }, [value, options]);

    useEffect(() => {
        if (selectedOption === null && optionAnimations.length > 0) {
            // Reset optionAnimations to 1 when selectedOption is null
            optionAnimations.forEach((anim) => {
                anim.setValue(1);
            });
            // Reset dropdown trigger animations
            toggleScale.setValue(0);
            toggleOpacity.setValue(0);
        }
    }, [selectedOption]);

    const commonEasing = Easing.inOut(Easing.ease);

    const onPressIn = () => {
        Animated.spring(toggleScale, {
            toValue: 0.95,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
        }).start();
    };

    const onPressOut = () => {
        Animated.spring(toggleScale, {
            toValue: 1,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
        }).start();
    };

    const toggleDropdown = () => {
        const shouldOpen = !isDropdownOpen;
        setIsDropdownOpen(shouldOpen);

        if (shouldOpen) {
            // Open dropdown
            setShouldRenderDropdown(true);

            // Reset optionAnimations values
            optionAnimations.forEach((anim) => {
                anim.setValue(0);
            });

            // Animate dropdown container
            Animated.timing(dropdownAnimation, {
                toValue: 1,
                duration: 300,
                easing: commonEasing,
                useNativeDriver: false,
            }).start();

            // Animate options in from top to bottom
            optionAnimations.forEach((anim, index) => {
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 300,
                    delay: index * 50,
                    easing: commonEasing,
                    useNativeDriver: true,
                }).start();
            });
        } else {
            // Close dropdown
            const totalOptionAnimationDuration = (options.length - 1) * 50 + 300;

            // Animate options out from bottom to top
            optionAnimations.forEach((anim, index) => {
                const reverseIndex = options.length - 1 - index;
                Animated.timing(anim, {
                    toValue: 0,
                    duration: 300,
                    delay: reverseIndex * 50,
                    easing: commonEasing,
                    useNativeDriver: true,
                }).start();
            });

            // Animate dropdown container
            Animated.timing(dropdownAnimation, {
                toValue: 0,
                duration: totalOptionAnimationDuration,
                easing: commonEasing,
                useNativeDriver: false,
            }).start(() => {
                setShouldRenderDropdown(false);
            });
        }
    };

    const handleOptionSelect = (option) => {
        if (!selectedOption) {
            // Initial selection from the list
            setIsAnimating(true);

            // Animate options out from bottom to top
            optionAnimations.forEach((anim, index) => {
                const reverseIndex = options.length - 1 - index;
                Animated.timing(anim, {
                    toValue: 0,
                    duration: 300,
                    delay: reverseIndex * 50,
                    easing: commonEasing,
                    useNativeDriver: true,
                }).start();
            });

            // Calculate total animation duration
            const totalOptionAnimationDuration = (options.length - 1) * 50 + 300;

            // After animations complete
            setTimeout(() => {
                setIsAnimating(false);
                // setSelectedOption(option);
                if (value === undefined) {
                    setSelectedOption(option);
                }
                onSelect(option);

                // Animate dropdown toggle appearing with fade-in and subtle bounce
                toggleScale.setValue(0.9);
                toggleOpacity.setValue(0);
                Animated.parallel([
                    Animated.spring(toggleScale, {
                        toValue: 1,
                        friction: 8, // Increased friction for less bounce
                        tension: 60,
                        useNativeDriver: true,
                    }),
                    Animated.timing(toggleOpacity, {
                        toValue: 1,
                        duration: 200,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]).start();
            }, totalOptionAnimationDuration);
        } else {
            // Selecting an option from the dropdown
            // setSelectedOption(option);
            if (value === undefined) {
                setSelectedOption(option);
            }
            onSelect(option);
            if (isDropdownOpen) {
                toggleDropdown();
            }
        }
    };

    const OPTION_HEIGHT = 46;

    const dropdownHeight = dropdownAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, options.length * OPTION_HEIGHT],
    });

    const renderOption = (option, index) => {
        const animationValue = optionAnimations[index];

        if (!animationValue) {
            // If the animation value is not available yet, skip rendering
            return null;
        }

        const translateY = animationValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-20, 0], // Moves upwards by 20 units when animating out
        });

        const scale = animationValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1], // Scales from 0 to 1
        });

        return (
            <Animated.View
                key={option.id}
                style={{
                    transform: [{ translateY }, { scale }],
                    opacity: 1, // Keep opacity constant
                }}
            >
                <Button
                    onPress={() => handleOptionSelect(option)}
                    bg='$surface'
                    hoverStyle={{ bg: '$surface' }}
                    justifyContent='flex-start'
                    alignItems='center'
                    size='$4'
                    borderRadius={0}
                    px='$4'
                    accessibilityLabel={`Select ${option.title}`}
                    accessibilityRole='button'
                >
                    <XStack alignItems='flex-start' justifyContent='flex-start' space='$3'>
                        {option.icon && <YStack>{option.icon}</YStack>}
                        <YStack>
                            <Text fontSize='$4'>{option.title}</Text>
                            {option.subtitle && (
                                <Text fontSize='$2' color='$textSecondary'>
                                    {option.subtitle}
                                </Text>
                            )}
                        </YStack>
                    </XStack>
                </Button>
                {index < options.length - 1 && <Separator bg='$borderColorWithShadow' />}
            </Animated.View>
        );
    };

    // Ensure optionAnimations are ready before rendering
    if (optionAnimations.length !== options.length) {
        return <Spinner color='$textSecondary' />;
    }

    // Render options or dropdown toggle based on state
    if (!selectedOption || isAnimating) {
        return (
            <YStack borderWidth={1} borderColor='$borderColor' borderRadius='$4' bg='$surface' width='100%' overflow='hidden'>
                {options.map((option, index) => renderOption(option, index))}
            </YStack>
        );
    }

    return (
        <YStack space='$4' width='100%'>
            <Animated.View
                style={{
                    opacity: toggleOpacity,
                    transform: [{ scale: toggleScale }],
                }}
            >
                <Button
                    onPress={toggleDropdown}
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    size='$5'
                    flex={1}
                    width='100%'
                    justifyContent='space-between'
                    bg='$surface'
                    borderWidth={1}
                    borderColor={isDropdownOpen ? '$borderColorWithShadow' : '$borderColor'}
                    hoverStyle={{ borderColor: '$surface' }}
                    borderRadius='$4'
                    shadowColor='$shadowColor'
                    shadowOffset={{ width: 0, height: isDropdownOpen ? 1 : 0 }}
                    shadowOpacity={isDropdownOpen ? 0.15 : 0}
                    shadowRadius={isDropdownOpen ? 3 : 0}
                    px='$4'
                    iconAfter={<FontAwesomeIcon icon={isDropdownOpen ? faChevronUp : faChevronDown} size={16} color={theme.textPrimary.val} />}
                    accessibilityLabel='Toggle options'
                    accessibilityRole='button'
                >
                    <XStack space='$3'>
                        {selectedOption?.icon && <YStack>{selectedOption.icon}</YStack>}
                        <YStack>
                            <Text fontSize='$4'>{selectedOption.title}</Text>
                            {selectedOption?.subtitle && (
                                <Text fontSize='$2' color='$textSecondary'>
                                    {selectedOption.subtitle}
                                </Text>
                            )}
                        </YStack>
                    </XStack>
                </Button>
            </Animated.View>

            {shouldRenderDropdown && (
                <Animated.View
                    style={{
                        height: dropdownHeight,
                        overflow: 'hidden',
                        backgroundColor: theme['$surface'].val,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.borderColorWithShadow.val,
                        marginTop: 0,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: isDropdownOpen ? 1 : 0 },
                        shadowOpacity: isDropdownOpen ? 0.15 : 0,
                        shadowRadius: isDropdownOpen ? 3 : 0,
                    }}
                >
                    {options.map((option, index) => renderOption(option, index))}
                </Animated.View>
            )}
        </YStack>
    );
};

export default ExpandableSelect;
