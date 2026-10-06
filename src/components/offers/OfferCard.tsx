import React from 'react';
import { Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { offerBadge, type Offer } from '../../commerce/offers';
import { formatCurrency } from '../../utils/format';
import { MediaImage, UIText, radius, usesTwelveHourClock, formatClock } from '../../ui';

/** One line about how and when an offer applies: "Use code GLOW8", "Ends Sunday", "Starts 2 pm". */
export function useOfferMeta() {
    const { t, locale } = useLanguage();
    const hour12 = usesTwelveHourClock(locale);
    return (offer: Offer, now: Date): { text: string; urgent: boolean } => {
        if (offer.availability === 'ended') return { text: t('Offers.ended'), urgent: false };
        if (offer.availability === 'scheduled' && offer.nextStartsAt) {
            const at = new Date(offer.nextStartsAt);
            const sameDay = at.toDateString() === now.toDateString();
            const time = formatClock(at.getHours() * 60 + at.getMinutes(), hour12);
            return { text: sameDay ? t('Offers.startsToday', { time }) : t('Offers.startsOn', { day: at.toLocaleDateString(locale, { weekday: 'long' }), time }), urgent: false };
        }
        const how = offer.code ? t('Offers.useCode', { code: offer.code }) : t('Offers.automatic');
        if (offer.endsAt) {
            const hours = (new Date(offer.endsAt).getTime() - now.getTime()) / 3600000;
            if (hours <= 24) return { text: `${t('Offers.endsToday')} · ${how}`, urgent: true };
            if (hours <= 72) return { text: `${t('Offers.endsOn', { day: new Date(offer.endsAt).toLocaleDateString(locale, { weekday: 'long' }) })} · ${how}`, urgent: true };
        }
        return { text: how, urgent: false };
    };
}

function useBadge() {
    const { t } = useLanguage();
    return (offer: Offer) => offerBadge(offer, (amount) => formatCurrency(amount, offer.currency ?? 'USD'), t('Offers.freeBadge'));
}

const BADGE_TONE: Record<Offer['type'], 'error' | 'success' | 'brand'> = { percentage: 'error', fixed_amount: 'error', free_delivery: 'success', bogo: 'brand' };

/** A banner card for the home rail and the featured offer. */
export function OfferBanner({ offer, onPress, primary = false, width }: { offer: Offer; onPress: () => void; primary?: boolean; width?: number }) {
    const { t } = useLanguage();
    const badge = useBadge();
    const fg = primary ? 'onPrimary' : 'primary';
    return (
        <Pressable onPress={onPress} accessibilityRole='button' accessibilityLabel={[offer.name, offer.owner?.name, offer.code ? t('Offers.useCode', { code: offer.code }) : t('Offers.automatic')].filter(Boolean).join(', ')} style={({ pressed }) => ({ width, opacity: pressed ? 0.9 : 1 })}>
            <XStack minHeight={128} borderRadius={radius.card} overflow='hidden' backgroundColor={primary ? '$primary' : '$surface2'}>
                <YStack flex={1} padding={16} gap={6}>
                    <UIText variant='subheading' tone={fg} style={{ fontSize: 18, lineHeight: 22 }} numberOfLines={2}>
                        {offer.name}
                    </UIText>
                    <UIText variant='caption' tone={primary ? 'onPrimary' : 'secondary'} numberOfLines={2}>
                        {offer.description ?? offer.owner?.name ?? ''}
                    </UIText>
                    <YStack marginTop='auto' alignSelf='flex-start' paddingHorizontal={10} paddingVertical={4} borderRadius={radius.pill} style={{ backgroundColor: primary ? 'rgba(255,255,255,0.18)' : undefined }} backgroundColor={primary ? undefined : '$background'}>
                        <UIText variant='captionStrong' tone={fg} style={{ fontSize: 12 }}>
                            {offer.code ? t('Offers.codeLabel', { code: offer.code }) : t('Offers.atCheckout')}
                        </UIText>
                    </YStack>
                </YStack>
                <YStack width={96}>
                    <MediaImage uri={offer.imageUrl} seed={offer.name} width={96} height={'100%' as any} radius={0} />
                    <YStack position='absolute' left={8} bottom={8} paddingHorizontal={8} paddingVertical={3} borderRadius={radius.pill} backgroundColor={`$${BADGE_TONE[offer.type] === 'brand' ? 'primary' : BADGE_TONE[offer.type]}` as any}>
                        <UIText variant='captionStrong' style={{ color: '#ffffff', fontSize: 12 }}>
                            {badge(offer)}
                        </UIText>
                    </YStack>
                </YStack>
            </XStack>
        </Pressable>
    );
}

/** A row in the offers list. */
export function OfferRow({ offer, now, onPress }: { offer: Offer; now: Date; onPress: () => void }) {
    const theme = useTheme();
    const badge = useBadge();
    const meta = useOfferMeta()(offer, now);
    return (
        <Pressable onPress={onPress} accessibilityRole='button' accessibilityLabel={[offer.name, offer.owner?.name, meta.text].filter(Boolean).join(', ')}>
            <XStack gap={12} alignItems='center' paddingVertical={12} borderBottomWidth={1} borderColor='$borderColor' opacity={offer.availability === 'live' ? 1 : 0.75}>
                <YStack>
                    <MediaImage uri={offer.imageUrl} seed={offer.name} width={64} height={64} radius={radius.tile} />
                    <YStack position='absolute' left={-4} bottom={-6} paddingHorizontal={7} paddingVertical={3} borderRadius={radius.pill} borderWidth={2} borderColor='$background' backgroundColor={`$${BADGE_TONE[offer.type] === 'brand' ? 'primary' : BADGE_TONE[offer.type]}` as any}>
                        <UIText variant='captionStrong' style={{ color: '#ffffff', fontSize: 11, lineHeight: 13 }}>
                            {badge(offer)}
                        </UIText>
                    </YStack>
                </YStack>
                <YStack flex={1} gap={2}>
                    <UIText variant='bodyStrong' numberOfLines={2}>
                        {offer.name}
                    </UIText>
                    {!!offer.owner?.name && (
                        <UIText variant='caption' tone='secondary'>
                            {offer.owner.name}
                        </UIText>
                    )}
                    <UIText variant='captionStrong' tone={meta.urgent ? 'warning' : 'secondary'} style={{ fontSize: 12 }}>
                        {meta.text}
                    </UIText>
                </YStack>
                <FontAwesomeIcon icon={faChevronRight} size={14} color={theme.textPlaceholder.val} />
            </XStack>
        </Pressable>
    );
}
