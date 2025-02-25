import React from 'react';
import { Animated } from 'react-native';
import { Stack, YStack, Text, XStack, useTheme } from 'tamagui';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import StoreLocationPicker from './StoreLocationPicker';
import { storefrontConfig } from '../utils';

const StoreHeader = ({ storeName, description, logoUrl, backgroundUrl, height = 250, wrapperStyle = {}, defaultStoreLocation = null }) => {
    const theme = useTheme();

    return (
        <Animated.View style={[{ position: 'relative', width: '100%', overflow: 'hidden', height }, wrapperStyle]}>
            <FastImage
                source={{ uri: backgroundUrl }}
                style={{
                    height: '100%',
                    width: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                }}
            />

            <Stack
                direction={storefrontConfig('styles.StoreHeader.direction', 'column')}
                px={storefrontConfig('styles.StoreHeader.padding', '$4')}
                space={storefrontConfig('styles.StoreHeader.space', '$1')}
                alignItems={storefrontConfig('styles.StoreHeader.alignItems', 'center')}
                justifyContent={storefrontConfig('styles.StoreHeader.justifyContent', 'flex-end')}
                flex={1}
                position='relative'
                zIndex={1}
            >
                <YStack alignItems={storefrontConfig('styles.StoreHeader.alignItems', 'center')} space='$1'>
                    {logoUrl && (
                        <YStack>
                            <FastImage
                                source={{ uri: logoUrl }}
                                style={{
                                    height: 45,
                                    width: 45,
                                }}
                            />
                        </YStack>
                    )}
                    <Text color='white' fontSize='$8' fontWeight='bold' numberOfLines={1}>
                        {storeName}
                    </Text>
                    <YStack>
                        {description && (
                            <YStack alignItems='center' justifyContent='center'>
                                <Text color='white' fontSize='$5' opacity={0.9} numberOfLines={2} textAlign='center'>
                                    {description}
                                </Text>
                            </YStack>
                        )}
                    </YStack>
                </YStack>

                <YStack alignItems='center' justifyContent='center'>
                    <StoreLocationPicker
                        defaultStoreLocation={defaultStoreLocation}
                        triggerStyle={{ borderWidth: 1, backgroundColor: theme['$gray-900'].val, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3 }}
                    />
                </YStack>
            </Stack>

            <LinearGradient
                colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    height: '100%',
                    width: '100%',
                }}
            />
        </Animated.View>
    );
};

export default StoreHeader;
