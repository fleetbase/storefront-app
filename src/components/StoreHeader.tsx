import React from 'react';
import { Animated } from 'react-native';
import { YStack, Text, XStack, Image } from 'tamagui';
import LinearGradient from 'react-native-linear-gradient';

const StoreHeader = ({ storeName, description, logoUrl, backgroundUrl, height = 200, wrapperStyle = {} }) => {
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

            <YStack padding='$4' justifyContent='flex-end' flex={1} position='relative' zIndex={1}>
                <XStack alignItems='center' space='$2'>
                    {logoUrl && (
                        <YStack>
                            <Image
                                source={{ uri: logoUrl }}
                                style={{
                                    height: 30,
                                    width: 30,
                                }}
                            />
                        </YStack>
                    )}
                    <Text color='white' fontSize='$8' fontWeight='bold' numberOfLines={1}>
                        {storeName}
                    </Text>
                </XStack>
                {description && (
                    <Text color='white' fontSize='$5' opacity={0.9} mt='$2' numberOfLines={1}>
                        {description}
                    </Text>
                )}
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
