import React from 'react';
import { Pressable } from 'react-native';
import { Card, Image, Paragraph, Text, XStack, YStack } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';

const MarketplaceStoreCard = ({ store, onPress, compact = false }: any) => {
    const { t } = useLanguage();
    const name = store?.getAttribute?.('name') || t('Marketplace.unknownStore');
    const distance = Number(store?.getAttribute?.('distance'));
    const online = store?.getAttribute?.('online');

    return (
        <Pressable accessibilityRole='button' accessibilityLabel={t('Marketplace.openStore', { storeName: name })} onPress={() => onPress?.(store)}>
            <Card bordered borderColor='$borderColor' bg='$surface' overflow='hidden' mb='$3'>
                {!compact && <Image source={{ uri: store?.getAttribute?.('backdrop_url') }} width='100%' height={120} resizeMode='cover' />}
                <XStack p='$3' gap='$3' alignItems='center'>
                    <Image source={{ uri: store?.getAttribute?.('logo_url') }} width={compact ? 48 : 64} height={compact ? 48 : 64} borderRadius='$3' bg='$background' />
                    <YStack flex={1} gap='$1'>
                        <XStack justifyContent='space-between' gap='$2'>
                            <Text color='$textPrimary' fontSize='$6' fontWeight='700' numberOfLines={1} flex={1}>
                                {name}
                            </Text>
                            <Text color={online === false ? '$red10' : '$green10'} fontSize='$3'>
                                {online === false ? t('Marketplace.offline') : t('Marketplace.online')}
                            </Text>
                        </XStack>
                        {!!store?.getAttribute?.('description') && (
                            <Paragraph color='$textSecondary' numberOfLines={2}>
                                {store.getAttribute('description')}
                            </Paragraph>
                        )}
                        <XStack gap='$3'>
                            <Text color='$textSecondary' fontSize='$3'>
                                {t('Marketplace.rating', { rating: Number(store?.getAttribute?.('rating') || 0).toFixed(1) })}
                            </Text>
                            {Number.isFinite(distance) && (
                                <Text color='$textSecondary' fontSize='$3'>
                                    {t('Marketplace.distanceMeters', { distance: Math.round(distance) })}
                                </Text>
                            )}
                        </XStack>
                    </YStack>
                </XStack>
            </Card>
        </Pressable>
    );
};

export default MarketplaceStoreCard;
