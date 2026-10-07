import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { UIText } from './Text';
import { elevation, radius } from './tokens';

export type CartPillProps = { count: number; total: string; storeName?: string | null; onPress?: () => void; bottom?: number };

/**
 * The floating "View cart" button. It names the store the cart belongs to, so the
 * customer always knows whose cart they are adding to.
 */
export function CartPill({ count, total, storeName, onPress, bottom = 16 }: CartPillProps) {
    const { t } = useLanguage();
    if (count <= 0) return null;
    const items = t('UI.itemsCount', { count });

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole='button'
            accessibilityLabel={[t('UI.viewCart'), storeName, items, total].filter(Boolean).join(', ')}
            style={({ pressed }) => ({ position: 'absolute', left: 16, right: 16, bottom, opacity: pressed ? 0.92 : 1 })}
        >
            <XStack height={56} borderRadius={radius.button} backgroundColor='$primary' alignItems='center' gap={12} paddingHorizontal={16} style={elevation.floating}>
                <YStack width={28} height={28} borderRadius={14} alignItems='center' justifyContent='center' style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    <UIText variant='captionStrong' tone='onPrimary'>
                        {count}
                    </UIText>
                </YStack>
                <YStack flex={1}>
                    <UIText variant='bodyStrong' tone='onPrimary'>
                        {t('UI.viewCart')}
                    </UIText>
                    {!!storeName && (
                        <UIText variant='caption' tone='onPrimary' numberOfLines={1}>
                            {storeName}
                        </UIText>
                    )}
                </YStack>
                <UIText variant='bodyStrong' tone='onPrimary'>
                    {total}
                </UIText>
            </XStack>
        </Pressable>
    );
}
