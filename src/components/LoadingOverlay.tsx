import React, { useMemo } from 'react';
import { YStack, Spinner, Text, useTheme } from 'tamagui';
import LinearGradient from 'react-native-linear-gradient';

interface LoadingOverlayProps {
    /** Whether the overlay should be visible */
    visible: boolean;
    /** Optional text to display below the spinner */
    text?: string;
    /** Size of the spinner (e.g. 48 or '48px') */
    spinnerSize?: number | string;
    /** Color for the spinner (e.g. a theme token like '$color' or a hex value) */
    spinnerColor?: string;
    /** Color for the text (e.g. a theme token like '$color' or a hex value) */
    textColor?: string;
    /**
     * Base background color for the overlay.
     * This will compute a gradient from [$`${bgColor}200`, $`${bgColor}600`, $`${bgColor}900`].
     * For example, if bgColor is 'gray', the gradient becomes ['$gray200', '$gray600', '$gray900'].
     */
    bgColor?: string;
    /** Opacity for the overlay background (0 to 1) */
    overlayOpacity?: number;
}

/**
 * LoadingOverlay
 *
 * Renders a full-screen loading overlay with a linear gradient background,
 * a centered Spinner from Tamagui, and an optional text label. The appearance
 * of the spinner, text, and background can be customized via props.
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    visible = false,
    text,
    spinnerSize = 48,
    spinnerColor = '$color',
    textColor = '$color',
    bgColor = 'gray',
    overlayOpacity = 0.8,
}) => {
    const theme = useTheme();
    const gradientColors = useMemo(() => {
        try {
            return [theme[`$${bgColor}-900`].val, theme[`$${bgColor}-800`].val, theme[`$${bgColor}-700`].val, theme[`$${bgColor}-500`].val];
        } catch (e) {
            // Fallback static colors if theme lookup fails.
            return ['#111827', '#1f2937', '#374151', '#6b7280'];
        }
    }, [bgColor, theme]);

    if (!visible) return null;
    return (
        <YStack position='absolute' top={0} left={0} right={0} bottom={0} justifyContent='center' alignItems='center' zIndex={9999}>
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ position: 'absolute', opacity: overlayOpacity, top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <Spinner size={spinnerSize} color={spinnerColor} />
            {text && (
                <Text marginTop='$2' fontSize={16} color={textColor}>
                    {text}
                </Text>
            )}
        </YStack>
    );
};

export default LoadingOverlay;
