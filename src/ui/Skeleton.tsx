import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, type DimensionValue } from 'react-native';
import { useTheme } from 'tamagui';

export type SkeletonProps = { width?: DimensionValue; height: number; radius?: number; style?: object };

/**
 * A placeholder block shaped like the content it stands in for. It pulses gently,
 * and holds still when the system asks for reduced motion. Hidden from screen readers.
 */
export function Skeleton({ width = '100%', height, radius = 8, style }: SkeletonProps) {
    const theme = useTheme();
    const opacity = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        let loop: Animated.CompositeAnimation | null = null;
        let cancelled = false;
        AccessibilityInfo.isReduceMotionEnabled?.()
            .then((reduced) => {
                if (reduced || cancelled) return;
                loop = Animated.loop(
                    Animated.sequence([
                        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
                        Animated.timing(opacity, { toValue: 0.6, duration: 700, useNativeDriver: true }),
                    ])
                );
                loop.start();
            })
            .catch(() => {});
        return () => {
            cancelled = true;
            loop?.stop();
        };
    }, [opacity]);

    return (
        <Animated.View
            accessibilityElementsHidden
            importantForAccessibility='no-hide-descendants'
            // A single style object: react-native-web's Animated.View sets array styles on the DOM node directly.
            style={{ ...StyleSheet.flatten(style), width, height, borderRadius: radius, backgroundColor: theme.surface2.val, opacity }}
        />
    );
}
