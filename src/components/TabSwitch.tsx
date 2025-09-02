import React, { useState, useEffect, useRef } from 'react';
import { Pressable, Animated, Easing } from 'react-native';
import { XStack, YStack, Text, useTheme } from 'tamagui';

const TabSwitch = ({ options, onTabChange, initialIndex = 0, borderRadius = 13 }) => {
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const [containerWidth, setContainerWidth] = useState(0);
    const theme = useTheme();

    const translateX = useRef(new Animated.Value(0)).current;

    const handleTabPress = (index: number) => {
        if (index !== activeIndex) {
            setActiveIndex(index);
            if (typeof onTabChange === 'function') {
                onTabChange(options[index].value);
            }
        }
    };

    // Handle container layout to get width
    const onContainerLayout = (event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
        translateX.setValue(initialIndex * (width / options.length));
    };

    useEffect(() => {
        // Prevent animation before layout
        if (containerWidth === 0) {
            return;
        }

        Animated.timing(translateX, {
            toValue: activeIndex * (containerWidth / options.length),
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
    }, [activeIndex, containerWidth, options.length, translateX]);

    return (
        <YStack alignItems='center' justifyContent='center' width='100%'>
            <XStack
                onLayout={onContainerLayout}
                position='relative'
                backgroundColor='$background'
                borderRadius={borderRadius}
                borderWidth={1}
                borderColor='$borderColor'
                overflow='hidden'
                width='100%'
                height={40}
                justifyContent='space-between'
            >
                {containerWidth > 0 && (
                    <Animated.View
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            flex: 1,
                            width: containerWidth / options.length,
                            height: '100%',
                            backgroundColor: theme.surface.val,
                            borderRadius: borderRadius,
                            transform: [
                                {
                                    translateX: translateX,
                                },
                            ],
                        }}
                    />
                )}

                {options.map((option, index) => (
                    <Pressable
                        key={index}
                        onPress={() => handleTabPress(index)}
                        style={{
                            paddingHorizontal: 10,
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <Text color={index === activeIndex ? theme.textPrimary.val : theme.textSecondary.val} fontWeight={index === activeIndex ? 'bold' : 'normal'}>
                            {option.label}
                        </Text>
                    </Pressable>
                ))}
            </XStack>
        </YStack>
    );
};

export default TabSwitch;
