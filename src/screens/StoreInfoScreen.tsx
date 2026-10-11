import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Store } from '@fleetbase/storefront';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAt, faChevronDown, faChevronUp, faGlobe, faPhone, faXmark } from '@fortawesome/free-solid-svg-icons';
import { faFacebook, faInstagram, faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';
import { effectiveOptions } from '../hooks/use-storefront-info';
import useStorefront from '../hooks/use-storefront';
import { ErrorState, IconButton, MediaImage, OfflineNotice, RatingLine, Skeleton, StoreLogo, UIText, formatClock, radius, space, storeSummary, usesTwelveHourClock } from '../ui';

const WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const attr = (item: any, key: string) => (typeof item?.getAttribute === 'function' ? item.getAttribute(key) : item?.[key]);

/** "09:00" / "09:00:00" → minutes since midnight. */
function minutesOf(value: unknown): number | null {
    const match = typeof value === 'string' ? /^(\d{1,2}):(\d{2})/.exec(value.trim()) : null;
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** The weekday (monday…sunday) an hours row is for, from a day name or number (0/7 = Sunday). */
function weekdayOf(hour: any): string | null {
    const raw = attr(hour, 'day_of_week') ?? attr(hour, 'day');
    if (typeof raw === 'number' || /^\d$/.test(String(raw ?? ''))) {
        const index = Number(raw) % 7;
        return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][index] ?? null;
    }
    const text = String(raw ?? '').toLowerCase();
    return WEEK.find((day) => text.length >= 3 && day.startsWith(text)) ?? null;
}

/** One location's hours for each day of the week; a day with no hours is closed. */
function weeklyHours(hours: any[], hour12: boolean, closedLabel: string) {
    return WEEK.map((day) => {
        const spans = hours
            .filter((hour) => weekdayOf(hour) === day)
            .map((hour) => [minutesOf(attr(hour, 'start')), minutesOf(attr(hour, 'end'))])
            .filter(([start, end]) => start !== null && end !== null)
            .sort((a, b) => (a[0] as number) - (b[0] as number));
        return { day, text: spans.length ? spans.map(([start, end]) => `${formatClock(start as number, hour12)} – ${formatClock(end as number, hour12)}`).join(', ') : closedLabel, closed: spans.length === 0 };
    });
}

/**
 * Store info, for both editions: each location with its weekly hours (today highlighted,
 * closed days marked), how to reach the store, its photos, and its rating when reviews
 * are on.
 */
const StoreInfoScreen = ({ route }: any) => {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const { adapter } = useStorefront();
    const { t, locale } = useLanguage();
    const { mode, ownerInfo } = useStorefrontRuntime();
    const hour12 = usesTwelveHourClock(locale);
    const params = route.params ?? {};
    const storeData = params.store ?? (mode !== 'network' ? ownerInfo : null);
    const store = useMemo(() => (storeData ? new Store(storeData, adapter) : null), [adapter, storeData]);
    const [locations, setLocations] = useState<any[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [retry, setRetry] = useState(0);
    const [expanded, setExpanded] = useState<string | null>(params.storeLocation?.id ?? null);

    useEffect(() => {
        if (!store) return;
        let active = true;
        setFailed(false);
        Promise.resolve(store.getLocations?.())
            .then((result: any) => {
                if (!active) return;
                const loaded = Array.from(result || []) as any[];
                setLocations(loaded);
                setExpanded((current) => current ?? loaded[0]?.id ?? null);
            })
            .catch(() => active && setFailed(true));
        return () => {
            active = false;
        };
    }, [store, retry]);

    const single = mode !== 'network';
    const options = effectiveOptions(mode, ownerInfo?.options, single ? null : attr(storeData, 'options'));
    const reviewsEnabled = single ? options.reviews_enabled !== false : options.reviews_enabled === true;
    const summary = useMemo(() => (storeData ? storeSummary({ ...storeData, locations: (locations ?? []).map((location) => ({ hours: attr(location, 'hours') ?? [] })) }, { t, hour12 }) : null), [hour12, locations, storeData, t]);
    const today = WEEK[(new Date().getDay() + 6) % 7];
    const media: string[] = (Array.isArray(attr(storeData, 'media')) ? attr(storeData, 'media') : []).map((item: any) => item?.url).filter((url: unknown) => typeof url === 'string');

    const openSocial = async (appUrl: string, webUrl: string) => {
        const supported = await Linking.canOpenURL(appUrl).catch(() => false);
        Linking.openURL(supported ? appUrl : webUrl);
    };
    const website = attr(storeData, 'website');
    const contacts = [
        attr(storeData, 'phone') && { key: 'phone', icon: faPhone, label: attr(storeData, 'phone'), action: t('StoreInfo.call'), onPress: () => Linking.openURL(`tel:${attr(storeData, 'phone')}`) },
        attr(storeData, 'email') && { key: 'email', icon: faAt, label: attr(storeData, 'email'), action: t('StoreInfo.email'), onPress: () => Linking.openURL(`mailto:${attr(storeData, 'email')}`) },
        website && { key: 'website', icon: faGlobe, label: website, action: t('StoreInfo.visit'), onPress: () => Linking.openURL(/^https?:\/\//i.test(website) ? website : `https://${website}`) },
    ].filter(Boolean) as Array<{ key: string; icon: any; label: string; action: string; onPress: () => void }>;
    const socials = [
        attr(storeData, 'instagram') && { key: 'instagram', icon: faInstagram, label: 'Instagram', onPress: () => openSocial(`instagram://user?username=${attr(storeData, 'instagram')}`, `https://www.instagram.com/${attr(storeData, 'instagram')}`) },
        attr(storeData, 'facebook') && { key: 'facebook', icon: faFacebook, label: 'Facebook', onPress: () => openSocial(`fb://profile/${attr(storeData, 'facebook')}`, `https://www.facebook.com/${attr(storeData, 'facebook')}`) },
        attr(storeData, 'twitter') && { key: 'twitter', icon: faXTwitter, label: 'X', onPress: () => openSocial(`x://user?screen_name=${attr(storeData, 'twitter')}`, `https://x.com/${attr(storeData, 'twitter')}`) },
    ].filter(Boolean) as Array<{ key: string; icon: any; label: string; onPress: () => void }>;

    if (!store || !summary) {
        return (
            <YStack flex={1} justifyContent='center' backgroundColor='$background'>
                <ErrorState />
            </YStack>
        );
    }

    return (
        <YStack flex={1} backgroundColor='$background'>
            <XStack alignItems='center' gap={12} paddingHorizontal={space.gutter} paddingTop={14} paddingBottom={12} borderBottomWidth={1} borderColor='$borderColor'>
                <StoreLogo uri={summary.logoUrl} name={summary.name} size={44} radius={radius.tile} />
                <YStack flex={1}>
                    <UIText variant='heading' accessibilityRole='header' numberOfLines={1}>
                        {summary.name}
                    </UIText>
                    {!!summary.statusText && (
                        <UIText variant='captionStrong' tone={summary.muted ? 'warning' : 'success'}>
                            {summary.statusText}
                        </UIText>
                    )}
                </YStack>
                <IconButton icon={faXmark} size={40} accessibilityLabel={t('UI.close')} onPress={() => navigation.goBack()} />
            </XStack>

            <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: space.gutter, paddingBottom: insets.bottom + 32, gap: 22 }}>
                <YStack gap={10}>
                    <UIText variant='subheading' accessibilityRole='header'>
                        {t('StoreInfo.locations')}
                    </UIText>
                    {failed ? (
                        <ErrorState description={t('StoreInfo.locationsError')} onRetry={() => setRetry((value) => value + 1)} />
                    ) : locations === null ? (
                        <>
                            <Skeleton height={64} radius={radius.card} />
                            <Skeleton height={64} radius={radius.card} />
                        </>
                    ) : locations.length === 0 ? (
                        <UIText tone='secondary'>{t('StoreInfo.noLocations')}</UIText>
                    ) : (
                        locations.map((location) => {
                            const open = expanded === location.id;
                            const hours = attr(location, 'hours') ?? [];
                            const status = storeSummary({ ...storeData, locations: [{ hours }] }, { t, hour12 });
                            const place = attr(location, 'place');
                            const address = attr(place, 'address') ?? [attr(place, 'street1'), attr(place, 'city'), attr(place, 'postal_code')].filter(Boolean).join(', ');
                            return (
                                <YStack key={location.id} borderRadius={radius.card} backgroundColor='$surface' paddingHorizontal={14}>
                                    <Pressable
                                        onPress={() => setExpanded(open ? null : location.id)}
                                        accessibilityRole='button'
                                        accessibilityState={{ expanded: open }}
                                        style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}
                                    >
                                        <YStack flex={1} gap={2}>
                                            <UIText variant='bodyStrong'>{attr(location, 'name') || summary.name}</UIText>
                                            {!!address && (
                                                <UIText variant='caption' tone='secondary'>
                                                    {address}
                                                </UIText>
                                            )}
                                            {!!status.statusText && (
                                                <UIText variant='captionStrong' tone={status.muted ? 'warning' : 'success'}>
                                                    {status.statusText}
                                                </UIText>
                                            )}
                                        </YStack>
                                        <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} size={14} color={theme.textSecondary.val} />
                                    </Pressable>
                                    {open && (
                                        <YStack paddingBottom={12} gap={2} accessibilityLabel={t('StoreInfo.openingHours')}>
                                            <UIText variant='captionStrong' tone='secondary' style={{ paddingBottom: 4 }}>
                                                {t('StoreInfo.openingHours')}
                                            </UIText>
                                            {weeklyHours(hours, hour12, t('StoreInfo.closed')).map((row) => {
                                                const isToday = row.day === today;
                                                return (
                                                    <XStack key={row.day} justifyContent='space-between' paddingHorizontal={8} paddingVertical={7} borderRadius={8} backgroundColor={isToday ? '$primarySoft' : 'transparent'}>
                                                        <UIText variant={isToday ? 'bodyStrong' : 'body'} style={{ fontSize: 14 }}>
                                                            {isToday ? t('StoreInfo.today', { day: t(`StoreInfo.days.${row.day}`) }) : t(`StoreInfo.days.${row.day}`)}
                                                        </UIText>
                                                        <UIText variant={isToday ? 'bodyStrong' : 'body'} tone={row.closed ? 'secondary' : 'primary'} style={{ fontSize: 14 }}>
                                                            {row.text}
                                                        </UIText>
                                                    </XStack>
                                                );
                                            })}
                                        </YStack>
                                    )}
                                </YStack>
                            );
                        })
                    )}
                </YStack>

                {(contacts.length > 0 || socials.length > 0) && (
                    <YStack gap={6}>
                        <UIText variant='subheading' accessibilityRole='header'>
                            {t('StoreInfo.contact')}
                        </UIText>
                        {contacts.map((contact) => (
                            <Pressable
                                key={contact.key}
                                onPress={contact.onPress}
                                accessibilityRole='link'
                                style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: theme.borderColor.val }}
                            >
                                <FontAwesomeIcon icon={contact.icon} size={16} color={theme.textSecondary.val} />
                                <UIText flex={1} numberOfLines={1}>
                                    {contact.label}
                                </UIText>
                                <UIText variant='captionStrong' tone='brand'>
                                    {contact.action}
                                </UIText>
                            </Pressable>
                        ))}
                        {socials.length > 0 && (
                            <XStack gap={8} flexWrap='wrap' paddingTop={6}>
                                {socials.map((social) => (
                                    <Pressable
                                        key={social.key}
                                        onPress={social.onPress}
                                        accessibilityRole='link'
                                        accessibilityLabel={t('StoreInfo.onSocial', { store: summary.name, network: social.label })}
                                        style={{ height: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: theme.surface.val, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                                    >
                                        <FontAwesomeIcon icon={social.icon} size={14} color={theme.textPrimary.val} />
                                        <UIText variant='captionStrong'>{social.label}</UIText>
                                    </Pressable>
                                ))}
                            </XStack>
                        )}
                    </YStack>
                )}

                {media.length > 0 && (
                    <YStack gap={10}>
                        <UIText variant='subheading' accessibilityRole='header'>
                            {t('StoreInfo.photos')}
                        </UIText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {media.map((url, index) => (
                                <MediaImage key={url} uri={url} seed={`${summary.name}-${index}`} width={120} height={90} radius={radius.tile} />
                            ))}
                        </ScrollView>
                    </YStack>
                )}

                {reviewsEnabled && (
                    <YStack gap={10}>
                        <XStack justifyContent='space-between' alignItems='center'>
                            <UIText variant='subheading' accessibilityRole='header'>
                                {t('StoreInfo.reviews')}
                            </UIText>
                            <Pressable
                                onPress={() => navigation.navigate('StoreReviews', { storeId: summary.id, storeName: summary.name, storeLogo: summary.logoUrl })}
                                accessibilityRole='link'
                                style={{ minHeight: 40, justifyContent: 'center' }}
                            >
                                <UIText variant='captionStrong' tone='brand'>
                                    {t('StoreInfo.seeAllReviews')}
                                </UIText>
                            </Pressable>
                        </XStack>
                        <XStack padding={14} borderRadius={radius.card} backgroundColor='$surface' alignItems='center' gap={12}>
                            <RatingLine rating={summary.rating} size={18} />
                        </XStack>
                    </YStack>
                )}
            </ScrollView>
            {/* Shown as a modal, above the app layout's own notice. */}
            <OfflineNotice top={12} />
        </YStack>
    );
};

export default StoreInfoScreen;
