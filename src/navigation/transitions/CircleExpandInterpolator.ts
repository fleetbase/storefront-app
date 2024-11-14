import React from 'react';
import { Extrapolate, interpolate, useAnimatedStyle } from 'react-native-reanimated';

const CircleExpandInterpolator = ({ current }) => {
    const animatedStyle = useAnimatedStyle(() => {
        const scale = interpolate(
            current.progress,
            [0, 1],
            [0.1, 2], // Adjust scale values to control the expand effect
            Extrapolate.CLAMP
        );
        const opacity = interpolate(current.progress, [0, 0.5, 1], [0, 0.5, 1]);

        return {
            transform: [{ scale }],
            opacity,
            borderRadius: 1000, // Ensures the view starts as a circle
            overflow: 'hidden',
            position: 'absolute',
            top: -height / 2, // Position to top right
            right: -width / 2,
        };
    });

    return {
        cardStyle: animatedStyle,
    };
};

export default CircleExpandInterpolator;
