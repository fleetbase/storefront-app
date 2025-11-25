import React from 'react';
import { Platform, ScrollView, View, ViewStyle, ScrollViewProps as RNScrollViewProps } from 'react-native';
import { SafeAreaView, Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { useTheme } from 'tamagui';
import { useSafeTabBarHeight } from '../hooks/use-safe-tab-bar-height';

/**
 * Props for the ScreenWrapper component
 */
export interface ScreenWrapperProps {
    /** Screen content */
    children: React.ReactNode;

    /** Explicit modal flag - overrides auto-detection */
    isModal?: boolean;

    /** Auto-detect modal from route params or name (default: true) */
    autoDetectModal?: boolean;

    /** Use SafeAreaView wrapper (default: true) */
    useSafeArea?: boolean;

    /** Which edges to apply safe area insets (default: ['top', 'bottom']) */
    edges?: Edge[];

    /** Custom top spacing override (in pixels) */
    topInset?: number;

    /** Custom bottom spacing override (in pixels) */
    bottomInset?: number;

    /** Custom left spacing override (in pixels) */
    leftInset?: number;

    /** Custom right spacing override (in pixels) */
    rightInset?: number;

    /** Padding for all sides */
    padding?: number | string;

    /** Top padding */
    paddingTop?: number | string;

    /** Bottom padding */
    paddingBottom?: number | string;

    /** Horizontal padding (left and right) */
    paddingHorizontal?: number | string;

    /** Background color (defaults to theme background) */
    backgroundColor?: string;

    /** Wrap content in ScrollView */
    scrollable?: boolean;

    /** Props to pass to ScrollView (only used if scrollable=true) */
    scrollViewProps?: RNScrollViewProps;

    /** Whether screen has a tab bar (default: auto-detect) */
    hasTabBar?: boolean;

    /** Container style */
    style?: ViewStyle;

    /** Content container style (for scrollable content) */
    contentContainerStyle?: ViewStyle;

    /** Custom wrapper renderer */
    renderWrapper?: (children: React.ReactNode) => React.ReactNode;

    /** Disable all platform-specific adjustments */
    disablePlatformAdjustments?: boolean;
}

/**
 * Detects if the screen is presented as a modal
 */
function detectIsModal(route: any, autoDetect: boolean, explicitIsModal?: boolean): boolean {
    // Explicit prop takes precedence
    if (explicitIsModal !== undefined) {
        return explicitIsModal;
    }

    // Auto-detection
    if (autoDetect) {
        const params = route?.params ?? {};
        const routeName = route?.name;

        // Check params - explicit false overrides default
        if (params.isModal !== undefined) {
            return params.isModal === true;
        }

        // Check route name pattern
        if (typeof routeName === 'string' && routeName.endsWith('Modal')) {
            return true;
        }
    }

    return false;
}

/**
 * Calculate top spacing based on platform and modal state
 */
function calculateTopSpacing(isModal: boolean, insets: { top: number }, customInset: number | undefined, disablePlatformAdjustments: boolean): number {
    // Custom inset overrides everything
    if (customInset !== undefined) {
        return customInset;
    }

    // If platform adjustments disabled, return 0
    if (disablePlatformAdjustments) {
        return 0;
    }

    // Android modal needs status bar spacing
    if (Platform.OS === 'android' && isModal) {
        return insets.top;
    }

    // iOS modals and regular screens handle their own spacing via SafeAreaView
    return 0;
}

/**
 * Calculate bottom spacing based on modal state and tab bar
 */
function calculateBottomSpacing(
    isModal: boolean,
    insets: { bottom: number },
    tabBarHeight: number,
    customInset: number | undefined,
    hasTabBar: boolean | undefined,
    disablePlatformAdjustments: boolean
): number {
    // Custom inset overrides everything
    if (customInset !== undefined) {
        return customInset;
    }

    // If platform adjustments disabled, return 0
    if (disablePlatformAdjustments) {
        return 0;
    }

    // Modal screens use safe area insets
    if (isModal) {
        return Platform.OS === 'ios' ? insets.bottom : 0;
    }

    // Regular screens with tab bar
    if (hasTabBar !== false) {
        return 0; // SafeAreaView handles this
    }

    return 0;
}

/**
 * ScreenWrapper Component
 *
 * A centralized component for managing screen spacing, safe areas, and modal-specific layouts.
 * Eliminates the need for scattered Platform checks and provides consistent behavior across iOS and Android.
 *
 * @example
 * // Basic usage
 * <ScreenWrapper>
 *   <YStack flex={1}>
 *     <Text>Content</Text>
 *   </YStack>
 * </ScreenWrapper>
 *
 * @example
 * // Modal screen
 * <ScreenWrapper isModal>
 *   <YStack flex={1}>
 *     <Text>Modal Content</Text>
 *   </YStack>
 * </ScreenWrapper>
 *
 * @example
 * // Auto-detect modal
 * <ScreenWrapper autoDetectModal>
 *   <YStack flex={1}>
 *     <Text>Content</Text>
 *   </YStack>
 * </ScreenWrapper>
 *
 * @example
 * // Scrollable screen
 * <ScreenWrapper scrollable>
 *   <YStack>
 *     // Long content here
 *   </YStack>
 * </ScreenWrapper>
 *
 * @example
 * // Custom insets
 * <ScreenWrapper topInset={20} bottomInset={0}>
 *   <YStack flex={1}>
 *     <Text>Custom Spacing</Text>
 *   </YStack>
 * </ScreenWrapper>
 */
export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
    children,
    isModal: explicitIsModal,
    autoDetectModal = true,
    useSafeArea = true,
    edges = ['top', 'bottom'],
    topInset,
    bottomInset,
    leftInset,
    rightInset,
    padding,
    paddingTop,
    paddingBottom,
    paddingHorizontal,
    backgroundColor,
    scrollable = false,
    scrollViewProps,
    hasTabBar,
    style,
    contentContainerStyle,
    renderWrapper,
    disablePlatformAdjustments = false,
    collapsable,
}) => {
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const tabBarHeight = useSafeTabBarHeight();

    // Determine if modal
    const isModal = detectIsModal(route, autoDetectModal, explicitIsModal);

    // Calculate spacing
    const topSpacing = calculateTopSpacing(isModal, insets, topInset, disablePlatformAdjustments);
    const bottomSpacing = calculateBottomSpacing(isModal, insets, tabBarHeight, bottomInset, hasTabBar, disablePlatformAdjustments);

    // Build container style
    const containerStyle: ViewStyle = {
        flex: 1,
        backgroundColor: backgroundColor || theme.background?.val || '#FFFFFF',
        paddingTop: paddingTop !== undefined ? paddingTop : topSpacing,
        paddingBottom: paddingBottom !== undefined ? paddingBottom : bottomSpacing,
        paddingLeft: leftInset !== undefined ? leftInset : paddingHorizontal !== undefined ? paddingHorizontal : undefined,
        paddingRight: rightInset !== undefined ? rightInset : paddingHorizontal !== undefined ? paddingHorizontal : undefined,
        padding: padding,
        ...style,
    };

    // Render content
    const content = <View style={containerStyle}>{children}</View>;

    // Apply custom wrapper if provided
    if (renderWrapper) {
        return <>{renderWrapper(content)}</>;
    }

    // Scrollable content
    if (scrollable) {
        const scrollContent = (
            <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} {...scrollViewProps} contentContainerStyle={contentContainerStyle}>
                {children}
            </ScrollView>
        );

        if (useSafeArea) {
            return (
                <SafeAreaView style={{ flex: 1, backgroundColor: backgroundColor || theme.background?.val || '#FFFFFF' }} edges={edges} collapsable={collapsable}>
                    {scrollContent}
                </SafeAreaView>
            );
        }

        return scrollContent;
    }

    // Regular content with SafeAreaView
    if (useSafeArea) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: backgroundColor || theme.background?.val || '#FFFFFF' }} edges={edges} collapsable={collapsable}>
                {content}
            </SafeAreaView>
        );
    }

    // Regular content without SafeAreaView
    return content;
};

export default ScreenWrapper;
