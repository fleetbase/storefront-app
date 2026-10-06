import React from 'react';
import { Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCalendarCheck, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { Badge } from './Badge';
import { MediaImage, StoreLogo } from './Media';
import { RatingLine } from './Rating';
import type { StoreSummary } from './store-display';
import { UIText } from './Text';
import { radius } from './tokens';

export type StoreCardProps = {
    store: StoreSummary;
    onPress?: () => void;
    /**
     * `hero`: backdrop above logo and details, for home rails and the directory.
     * `compact`: a list row with a thumbnail, for "All stores" and search.
     * `map`: a small horizontal card for the map carousel.
     */
    variant?: 'hero' | 'compact' | 'map';
    width?: number | string;
    selected?: boolean;
    testID?: string;
};

function storeLabel(store: StoreSummary, t: (key: string, params?: Record<string, unknown>) => string) {
    return [store.name, store.rating !== null ? t('UI.ratingLabel', { rating: store.rating }) : null, store.category, store.distance, store.statusText].filter(Boolean).join(', ');
}

function MetaLine({ store }: { store: StoreSummary }) {
    const details = [store.category, store.distance].filter(Boolean).join(' · ');
    return (
        <XStack alignItems='center' gap={4} flexWrap='nowrap'>
            <RatingLine rating={store.rating} />
            {!!details && (
                <UIText variant='caption' tone='secondary' numberOfLines={1} flexShrink={1}>
                    {store.rating !== null ? '· ' : ''}
                    {details}
                </UIText>
            )}
        </XStack>
    );
}

function StatusLine({ store }: { store: StoreSummary }) {
    if (!store.statusText) return null;
    return (
        <UIText variant='captionStrong' tone={store.muted ? 'secondary' : 'success'} numberOfLines={1}>
            {store.statusText}
        </UIText>
    );
}

/** A store in a list, rail or map carousel. Closed and offline stores are muted but stay tappable. */
export function StoreCard({ store, onPress, variant = 'hero', width, selected = false, testID }: StoreCardProps) {
    const { t } = useLanguage();
    const theme = useTheme();
    const label = storeLabel(store, t);

    if (variant === 'compact') {
        return (
            <Pressable onPress={onPress} accessibilityRole='button' accessibilityLabel={label} testID={testID} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                <XStack alignItems='center' gap={12} paddingVertical={10} minHeight={72}>
                    <YStack>
                        <MediaImage uri={store.backdropUrl} seed={store.name} width={64} height={64} radius={radius.tile} dimmed={store.muted} />
                        <YStack position='absolute' right={-4} bottom={-4}>
                            <StoreLogo uri={store.logoUrl} name={store.name} size={28} radius={14} border />
                        </YStack>
                    </YStack>
                    <YStack flex={1} gap={2}>
                        <UIText variant='bodyStrong' numberOfLines={1}>
                            {store.name}
                        </UIText>
                        <MetaLine store={store} />
                        <StatusLine store={store} />
                    </YStack>
                    <FontAwesomeIcon icon={faChevronRight} size={14} color={theme.textPlaceholder.val} />
                </XStack>
            </Pressable>
        );
    }

    if (variant === 'map') {
        return (
            <Pressable onPress={onPress} accessibilityRole='button' accessibilityLabel={label} accessibilityState={{ selected }} testID={testID}>
                <XStack
                    width={(width as any) ?? 300}
                    gap={12}
                    padding={10}
                    borderRadius={radius.card}
                    backgroundColor='$background'
                    borderWidth={2}
                    borderColor={selected ? '$primaryForeground' : '$background'}
                    style={{ shadowColor: '#101828', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
                >
                    <MediaImage uri={store.backdropUrl} seed={store.name} width={84} height={84} radius={radius.tile} dimmed={store.muted} />
                    <YStack flex={1} gap={3} justifyContent='center'>
                        <XStack alignItems='center' gap={8}>
                            <StoreLogo uri={store.logoUrl} name={store.name} size={24} radius={6} />
                            <UIText variant='bodyStrong' numberOfLines={1} flex={1}>
                                {store.name}
                            </UIText>
                        </XStack>
                        <MetaLine store={store} />
                        <StatusLine store={store} />
                    </YStack>
                </XStack>
            </Pressable>
        );
    }

    return (
        <Pressable onPress={onPress} accessibilityRole='button' accessibilityLabel={label} testID={testID} style={({ pressed }) => ({ width: width as any, opacity: pressed ? 0.9 : 1 })}>
            <YStack gap={10}>
                <MediaImage uri={store.backdropUrl} seed={store.name} height={132} dimmed={store.muted}>
                    {store.muted && store.statusText && (
                        <YStack position='absolute' left={10} top={10}>
                            <Badge tone='scrim' label={store.statusText} />
                        </YStack>
                    )}
                    {store.bookable && (
                        <YStack position='absolute' right={10} top={10}>
                            <Badge tone='light' icon={faCalendarCheck} label={t('UI.bookOnline')} />
                        </YStack>
                    )}
                </MediaImage>
                <XStack gap={10} alignItems='flex-start'>
                    <StoreLogo uri={store.logoUrl} name={store.name} size={40} />
                    <YStack flex={1} gap={2}>
                        <UIText variant='bodyStrong' numberOfLines={1}>
                            {store.name}
                        </UIText>
                        <MetaLine store={store} />
                        <StatusLine store={store} />
                    </YStack>
                </XStack>
            </YStack>
        </Pressable>
    );
}
