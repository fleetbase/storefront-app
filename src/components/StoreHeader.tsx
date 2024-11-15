import React from 'react';
import { Image } from 'tamagui';
import { YStack, Text, XStack } from 'tamagui';
import LinearGradient from 'react-native-linear-gradient';

const StoreHeader = ({ storeName, description, logoUrl, backgroundUrl }) => {
    return (
        <YStack height={200} width='100%' position='relative' overflow='hidden'>
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
                    <Text color='white' fontSize='$8' fontWeight='bold'>
                        {storeName}
                    </Text>
                </XStack>
                <Text color='white' fontSize='$5' opacity={0.9} mt='$2'>
                    {description}
                </Text>
            </YStack>

            <LinearGradient
                colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    height: '100%',
                    width: '100%',
                }}
            />
        </YStack>
    );
};

export default StoreHeader;
