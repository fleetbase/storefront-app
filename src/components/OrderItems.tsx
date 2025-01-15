import React, { useRef, useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FlatList } from 'react-native';
import { Button, Image, Text, YStack, XStack, Separator, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from '../utils/format';
import { loadPersistedResource, showActionSheet } from '../utils';
import FastImage from 'react-native-fast-image';

const OrderItems = ({ order }) => {
    const theme = useTheme();
    const contents = order.getAttribute('payload.entities', []);

    return (
        <YStack bg='$surface' borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' space='$2'>
            <FlatList
                data={contents}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item: entity }) => {
                    return (
                        <XStack space='$3' p='$4'>
                            <XStack flex={1} space='$3' justifyContent='space-between'>
                                <XStack flex={1} space='$3'>
                                    <YStack>
                                        <XStack
                                            width={40}
                                            height={40}
                                            borderWidth={1}
                                            bg='$background'
                                            borderColor='$borderColorWithShadow'
                                            borderRadius='$3'
                                            alignItems='center'
                                            justifyContent='center'
                                        >
                                            <XStack alignItems='flex-end'>
                                                <Text fontSize='$1' color='$primary'>
                                                    x
                                                </Text>
                                                <Text fontSize='$5' fontWeight='bold' color='$primary'>
                                                    {entity.meta.quantity}
                                                </Text>
                                            </XStack>
                                        </XStack>
                                    </YStack>
                                    <YStack
                                        borderWidth={1}
                                        borderColor='$borderColor'
                                        borderRadius='$3'
                                        height={60}
                                        width={60}
                                        alignItems='center'
                                        justifyContent='center'
                                        position='relative'
                                    >
                                        <FastImage
                                            source={{ uri: entity.photo_url }}
                                            style={{
                                                height: '100%',
                                                width: '100%',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                borderRadius: 5,
                                            }}
                                        />
                                    </YStack>
                                    <YStack flex={1}>
                                        <Text fontSize='$5' fontWeight='bold' color='$textPrimary' mb='$1' numberOfLines={1}>
                                            {entity.name}
                                        </Text>
                                        {entity.description && (
                                            <Text fontSize='$4' color='$textSecondary'>
                                                {entity.description}
                                            </Text>
                                        )}
                                        <YStack>
                                            {entity.meta.variants.filter(Boolean).map((variant) => (
                                                <XStack key={variant.id} alignItems='center' space='$2'>
                                                    <Text flex={1} fontSize='$3' color='$textSecondary' numberOfLines={1}>
                                                        {variant.name}
                                                    </Text>
                                                </XStack>
                                            ))}
                                            {entity.meta.addons.filter(Boolean).map((addon) => (
                                                <XStack key={addon.id} alignItems='center' space='$2'>
                                                    <Text flex={1} fontSize='$3' color='$textSecondary' numberOfLines={1}>
                                                        {addon.name}
                                                    </Text>
                                                </XStack>
                                            ))}
                                        </YStack>
                                    </YStack>
                                </XStack>
                                <YStack width={80} alignItems='flex-end'>
                                    <YStack>
                                        <Text fontSize='$5' color='$primary' fontWeight='bold'>
                                            {formatCurrency(entity.meta.subtotal, entity.currency)}
                                        </Text>
                                    </YStack>
                                </YStack>
                            </XStack>
                        </XStack>
                    );
                }}
                ItemSeparatorComponent={() => <Separator borderBottomWidth={1} borderColor='$borderColorWithShadow' />}
            />
        </YStack>
    );
};

export default OrderItems;
