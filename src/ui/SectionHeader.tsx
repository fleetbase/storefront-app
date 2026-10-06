import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { UIText } from './Text';
import { space } from './tokens';

export type SectionHeaderProps = { title: string; subtitle?: string; actionLabel?: string; onAction?: () => void; inset?: boolean };

/** A section title with an optional subtitle and "See all" link. */
export function SectionHeader({ title, subtitle, actionLabel, onAction, inset = true }: SectionHeaderProps) {
    const { t } = useLanguage();
    return (
        <XStack alignItems='center' justifyContent='space-between' paddingHorizontal={inset ? space.gutter : 0}>
            <YStack flex={1}>
                <UIText variant='heading' accessibilityRole='header' numberOfLines={1}>
                    {title}
                </UIText>
                {!!subtitle && (
                    <UIText variant='caption' tone='secondary'>
                        {subtitle}
                    </UIText>
                )}
            </YStack>
            {onAction && (
                <Pressable onPress={onAction} accessibilityRole='link' accessibilityLabel={`${actionLabel ?? t('UI.seeAll')}, ${title}`} hitSlop={10} style={{ paddingLeft: 12, paddingVertical: 10 }}>
                    <UIText variant='bodyStrong' tone='brand'>
                        {actionLabel ?? t('UI.seeAll')}
                    </UIText>
                </Pressable>
            )}
        </XStack>
    );
}
