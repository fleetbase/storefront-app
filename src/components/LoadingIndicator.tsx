import React from 'react';
import { StyleSheet } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { Spinner, YStack, Text, useTheme } from 'tamagui';

const LoadingIndicator = ({ isLoading = false, loadingMessage = 'Loading...', spinnerSize = 'large', space = '$4', theme = 'basic', wrapperStyle = {}, wrapperProps = {} }) => {
    // Create a glass indicator style theme
    if (theme === 'glass') {
        wrapperProps = {
            ...wrapperProps,
            borderWidth: 2,
            borderColor: '$borderColor',
            borderRadius: '$4',
            padding: '$4',
        };
    }

    return (
        <YStack space={space} alignItems='center' justifyContent='center' style={wrapperStyle} {...wrapperProps}>
            {theme === 'glass' && (
                <BlurView style={StyleSheet.absoluteFillObject} blurType='light' blurAmount={10} borderRadius={10} reducedTransparencyFallbackColor='rgba(255, 255, 255, 0.8)' />
            )}
            <Spinner size={spinnerSize} color='$color' />
            <Text fontSize={15} color='$color'>
                {loadingMessage}
            </Text>
        </YStack>
    );
};

export default LoadingIndicator;
