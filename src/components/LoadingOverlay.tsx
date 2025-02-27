import React, { useMemo } from 'react';
import { YStack, Spinner, Text, useTheme } from 'tamagui';
import LinearGradient from 'react-native-linear-gradient';

interface LoadingOverlayProps {
    visible: boolean;
    text?: string;
    spinnerSize?: number | string;
    spinnerColor?: string;
    textColor?: string;
    bgColor?: string;
    overlayOpacity?: number;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    visible = false,
    text,
    spinnerSize = 48,
    spinnerColor = '$textPrimary',
    textColor = '$textPrimary',
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
