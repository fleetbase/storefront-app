import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { itemsPreview, type OrderSummary } from '../../commerce/order-summary';
import { formatCurrency } from '../../utils/format';
import { Badge, MediaImage, UIText, formatClock, radius, usesTwelveHourClock } from '../../ui';

const THUMBS = 4;

/** "14:32" today, "Mon 14:32" this week, "12 Oct 14:32" before that. */
function orderedAt(iso: string | null, hour12: boolean, locale: string): string | null {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    const time = formatClock(date.getHours() * 60 + date.getMinutes(), hour12);
    const now = new Date();
    const days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86400000);
    if (days === 0) return time;
    try {
        const day = date.toLocaleDateString(locale, days < 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' });
        return `${day} ${time}`;
    } catch {
        return time;
    }
}

/**
 * An order in progress, at a glance: its status and when it was placed, a small timeline of
 * its steps, and the products in it.
 */
export default function ActiveOrderPreview({ order, width, onPress }: { order: OrderSummary; width: number; onPress: () => void }) {
    const theme = useTheme();
    const { t, locale } = useLanguage();
    const hour12 = usesTwelveHourClock(locale);
    const flow = order.isPickup ? 'pickup' : 'delivery';
    const current = order.steps.find((step) => step.state === 'current') ?? [...order.steps].reverse().find((step) => step.state === 'done') ?? null;
    const placed = orderedAt(order.createdAt, hour12, locale);
    const thumbs = order.lines.slice(0, THUMBS);
    const extra = order.lines.length - thumbs.length;

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole='button'
            accessibilityLabel={t('Account.activeOrderLabel', { id: order.reference })}
            testID='shop-active-order'
            style={({ pressed }) => ({ width, padding: 14, gap: 12, borderRadius: radius.card, borderWidth: 1, borderColor: theme.primary.val, backgroundColor: theme.primarySoft.val, opacity: pressed ? 0.9 : 1 })}
        >
            <XStack alignItems='center' justifyContent='space-between' gap={8}>
                <Badge label={t(`Orders.status.${order.phase}`)} tone='brand' size='sm' />
                <UIText variant='caption' tone='secondary' numberOfLines={1}>
                    {[order.reference, placed].filter(Boolean).join(' · ')}
                </UIText>
            </XStack>

            <UIText variant='bodyStrong' numberOfLines={2}>
                {t(`Tracking.phase.${order.phase}.title`, { store: order.storeName, driver: t('Tracking.yourDriver') })}
            </UIText>

            {/* The steps as dots on a line: filled once done, ringed while current. */}
            {order.steps.length > 0 && (
                <YStack gap={6} accessibilityRole='progressbar' accessibilityLabel={current ? t(`Tracking.step.${flow}.${current.key}`) : undefined}>
                    <XStack alignItems='center'>
                        {order.steps.map((step, index) => (
                            <React.Fragment key={step.key}>
                                {index > 0 && <YStack flex={1} height={2} backgroundColor={step.state === 'todo' ? '$borderColor' : '$primary'} />}
                                <YStack
                                    width={step.state === 'current' ? 14 : 10}
                                    height={step.state === 'current' ? 14 : 10}
                                    borderRadius={7}
                                    backgroundColor={step.state === 'done' ? '$primary' : '$background'}
                                    borderWidth={step.state === 'todo' ? 2 : 3}
                                    borderColor={step.state === 'todo' ? '$borderColor' : '$primary'}
                                />
                            </React.Fragment>
                        ))}
                    </XStack>
                    {current && (
                        <UIText variant='caption' tone='secondary' numberOfLines={1}>
                            {[t(`Tracking.step.${flow}.${current.key}`), current.at ? orderedAt(current.at, hour12, locale) : null].filter(Boolean).join(' · ')}
                        </UIText>
                    )}
                </YStack>
            )}

            {order.lines.length > 0 && (
                <YStack gap={8}>
                    <XStack gap={6} alignItems='center'>
                        {thumbs.map((line) => (
                            <MediaImage key={line.id} uri={line.imageUrl} seed={line.name} width={40} height={40} radius={radius.tile} />
                        ))}
                        {extra > 0 && (
                            <YStack width={40} height={40} borderRadius={radius.tile} backgroundColor='$background' alignItems='center' justifyContent='center'>
                                <UIText variant='captionStrong' tone='secondary'>
                                    +{extra}
                                </UIText>
                            </YStack>
                        )}
                    </XStack>
                    <UIText variant='caption' tone='secondary' numberOfLines={1}>
                        {[itemsPreview(order.lines, (count) => t('Orders.andMore', { count })), order.total > 0 ? formatCurrency(order.total, order.currency ?? undefined) : null].filter(Boolean).join(' · ')}
                    </UIText>
                </YStack>
            )}
        </Pressable>
    );
}
