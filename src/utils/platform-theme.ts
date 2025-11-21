/**
 * Platform-specific theme utilities for consistent cross-platform UI
 * 
 * This module provides platform-specific values to handle differences between iOS and Android
 * while maintaining Fleetbase's minimal padding/spacing design philosophy.
 * 
 * Usage:
 *   import { platformSpacing, platformText } from '../utils/platform-theme';
 *   
 *   <YStack marginTop={platformSpacing.cardMargin}>
 *     <Text lineHeight={platformText.lineHeight(16)}>Content</Text>
 *   </YStack>
 */

import { Platform } from 'react-native';

/**
 * Platform-specific spacing values
 * Follows Fleetbase's minimal spacing philosophy while accounting for platform differences
 */
export const platformSpacing = {
    // Card and container margins
    cardMarginTop: Platform.select({ ios: 16, android: 12 }),
    cardMarginBottom: Platform.select({ ios: 16, android: 12 }),
    cardMarginHorizontal: Platform.select({ ios: 16, android: 12 }),
    
    // Internal padding for cards and containers
    cardPaddingTop: Platform.select({ ios: 16, android: 14 }),
    cardPaddingBottom: Platform.select({ ios: 16, android: 14 }),
    cardPaddingHorizontal: Platform.select({ ios: 16, android: 14 }),
    
    // Section spacing
    sectionGap: Platform.select({ ios: 12, android: 10 }),
    
    // Element spacing
    elementGap: Platform.select({ ios: 8, android: 6 }),
    
    // Map padding
    mapEdgePadding: {
        top: Platform.select({ ios: 50, android: 40 }),
        right: Platform.select({ ios: 50, android: 40 }),
        bottom: Platform.select({ ios: 50, android: 40 }),
        left: Platform.select({ ios: 50, android: 40 }),
    },
};

/**
 * Platform-specific text styling
 */
export const platformText = {
    /**
     * Calculate appropriate line height for given font size
     * Android typically needs slightly more line height for proper text rendering
     */
    lineHeight: (fontSize: number): number => {
        return Platform.select({
            ios: Math.round(fontSize * 1.4),
            android: Math.round(fontSize * 1.5),
        }) as number;
    },
    
    /**
     * Font weight adjustments
     * Android renders font weights differently than iOS
     */
    fontWeight: {
        normal: Platform.select({ ios: '400', android: '400' }),
        medium: Platform.select({ ios: '500', android: '600' }), // Android needs heavier weight
        semibold: Platform.select({ ios: '600', android: '700' }),
        bold: Platform.select({ ios: '700', android: '800' }),
    },
};

/**
 * Platform-specific component adjustments
 */
export const platformComponent = {
    /**
     * Border radius adjustments
     */
    borderRadius: {
        small: Platform.select({ ios: 8, android: 8 }),
        medium: Platform.select({ ios: 12, android: 12 }),
        large: Platform.select({ ios: 16, android: 16 }),
    },
    
    /**
     * Shadow/elevation adjustments
     */
    shadow: {
        small: Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
        medium: Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
        large: Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
        }),
    },
};

/**
 * Helper to check if running on Android
 */
export const isAndroid = Platform.OS === 'android';

/**
 * Helper to check if running on iOS
 */
export const isIOS = Platform.OS === 'ios';

/**
 * Get platform-specific value
 * Useful for inline platform-specific values
 * 
 * @example
 * const padding = getPlatformValue({ ios: 20, android: 16 });
 */
export function getPlatformValue<T>(values: { ios: T; android: T }): T {
    return Platform.select(values) as T;
}

export default {
    spacing: platformSpacing,
    text: platformText,
    component: platformComponent,
    isAndroid,
    isIOS,
    getPlatformValue,
};
