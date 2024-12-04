import React from 'react';
import { Animated } from 'react-native';
import { YStack, Text, XStack, Image, useTheme } from 'tamagui';
import LinearGradient from 'react-native-linear-gradient';
import StoreLocationPicker from './StoreLocationPicker';

const StoreHeader = ({ storeName, description, logoUrl, backgroundUrl, height = 250, wrapperStyle = {} }) => {
    const theme = useTheme();

    return (
        <Animated.View style={[{ position: 'relative', width: '100%', overflow: 'hidden', height }, wrapperStyle]}>
            <Image
                source={{ uri: backgroundUrl }}
                style={{
                    height: '100%',
                    width: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                }}
                resizeMode='cover'
            />

            <YStack px='$4' space='$1' justifyContent='flex-end' flex={1} position='relative' zIndex={1}>
                <YStack alignItems='center' space='$1'>
                    {logoUrl && (
                        <YStack>
                            <Image
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
                </YStack>
                <YStack>
                    {description && (
                        <YStack mt='$2' borderRadius='$4' bg='$gray-900' py='$2' px='$1' alignItems='center' justifyContent='center'>
                            <Text color='white' fontSize='$5' opacity={0.9} numberOfLines={1}>
                                {description}
                            </Text>
                        </YStack>
                    )}
                </YStack>
                <YStack alignItems='center' justifyContent='center'>
                    <StoreLocationPicker triggerStyle={{ borderWidth: 1, backgroundColor: theme['$gray-900'].val, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3 }} />
                </YStack>
            </YStack>

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
