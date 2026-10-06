import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { faChevronLeft, faTag } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useStorefront from '../../hooks/use-storefront';
import { OFFER_TYPES, featuredOffer, fetchOffers, groupOffers, type Offer, type OfferType } from '../../commerce/offers';
import { OfferBanner, OfferRow } from '../../components/offers/OfferCard';
import { EmptyState, ErrorState, IconButton, Skeleton, UIText, radius, space } from '../../ui';

/**
 * Every public offer on the storefront: a featured offer, then offers ending soon,
 * ongoing ones and ones that start later, filterable by kind of discount.
 */
const OffersScreen = ({ route }: any) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t } = useLanguage();
    const { storefront } = useStorefront();
    const { ownerInfo } = useStorefrontRuntime();
    const storeId: string | null = route?.params?.storeId ?? null;
    const [offers, setOffers] = useState<Offer[]>([]);
    const [filter, setFilter] = useState<OfferType | 'all'>('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    const now = useMemo(() => new Date(), [offers]); // eslint-disable-line react-hooks/exhaustive-deps

    const load = useCallback(
        async (refresh = false) => {
            const adapter = storefront?.getAdapter?.();
            if (!adapter) return;
            refresh ? setRefreshing(true) : setLoading(true);
            setError(false);
            try {
                setOffers(await fetchOffers((path, query) => adapter.get(path, query), { storeId }));
            } catch {
                setError(true);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [storeId, storefront]
    );

    useEffect(() => {
        load();
    }, [load]);

    const visible = filter === 'all' ? offers : offers.filter((offer) => offer.type === filter);
    const featured = featuredOffer(visible);
    const groups = groupOffers(
        visible.filter((offer) => offer !== featured),
        now
    );
    const sections = [
        { key: 'endingSoon', title: t('Offers.endingSoon'), offers: groups.endingSoon },
        { key: 'ongoing', title: t('Offers.ongoing'), offers: groups.ongoing },
        { key: 'upcoming', title: t('Offers.upcoming'), offers: groups.upcoming },
    ].filter((section) => section.offers.length > 0);
    const open = (offer: Offer) => navigation.navigate('Offer', { offerId: offer.id });

    return (
        <YStack flex={1} backgroundColor='$background'>
            <XStack alignItems='center' gap={8} paddingHorizontal={8} paddingTop={insets.top + 4} paddingBottom={8}>
                <IconButton icon={faChevronLeft} variant='plain' size={44} accessibilityLabel={t('UI.back')} onPress={() => navigation.goBack()} />
                <YStack flex={1}>
                    <UIText variant='heading' accessibilityRole='header'>
                        {t('Offers.title')}
                    </UIText>
                    {!!ownerInfo?.name && (
                        <UIText variant='caption' tone='secondary'>
                            {t('Offers.on', { name: ownerInfo.name })}
                        </UIText>
                    )}
                </YStack>
            </XStack>

            <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 12, gap: 8 }} accessibilityRole='radiogroup' accessibilityLabel={t('Offers.filterLabel')}>
                    {(['all', ...OFFER_TYPES] as const).map((option) => {
                        const selected = option === filter;
                        return (
                            <Pressable
                                key={option}
                                onPress={() => setFilter(option)}
                                accessibilityRole='radio'
                                accessibilityState={{ checked: selected }}
                                style={{ height: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: selected ? theme.textPrimary.val : theme.borderColor.val, backgroundColor: selected ? theme.textPrimary.val : theme.background.val, justifyContent: 'center' }}
                            >
                                <UIText variant='captionStrong' style={{ color: selected ? theme.background.val : theme.textPrimary.val }}>
                                    {t(`Offers.filters.${option}`)}
                                </UIText>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                {loading ? (
                    <YStack paddingHorizontal={space.gutter} gap={14}>
                        <Skeleton height={150} radius={radius.card} />
                        {[0, 1, 2].map((index) => (
                            <XStack key={index} gap={12} alignItems='center'>
                                <Skeleton width={64} height={64} radius={radius.tile} />
                                <YStack flex={1} gap={6}>
                                    <Skeleton height={16} width='70%' />
                                    <Skeleton height={12} width='40%' />
                                </YStack>
                            </XStack>
                        ))}
                    </YStack>
                ) : error ? (
                    <ErrorState title={t('Offers.loadFailed')} onRetry={() => load()} />
                ) : visible.length === 0 ? (
                    <EmptyState
                        icon={faTag}
                        title={filter === 'all' ? t('Offers.emptyTitle') : t('Offers.emptyFiltered')}
                        description={filter === 'all' ? t('Offers.emptyBody') : undefined}
                        actionLabel={filter === 'all' ? t('Cart.browseStores') : t('Offers.showAll')}
                        onAction={() => (filter === 'all' ? navigation.goBack() : setFilter('all'))}
                    />
                ) : (
                    <YStack gap={18}>
                        {featured && (
                            <YStack paddingHorizontal={space.gutter}>
                                <OfferBanner offer={featured} primary onPress={() => open(featured)} />
                            </YStack>
                        )}
                        {sections.map((section) => (
                            <YStack key={section.key} paddingHorizontal={space.gutter} accessibilityLabel={section.title}>
                                <UIText variant='subheading' style={{ fontSize: 17 }} accessibilityRole='header'>
                                    {section.title}
                                </UIText>
                                {section.offers.map((offer) => (
                                    <OfferRow key={offer.id} offer={offer} now={now} onPress={() => open(offer)} />
                                ))}
                            </YStack>
                        ))}
                    </YStack>
                )}
            </ScrollView>
        </YStack>
    );
};

export default OffersScreen;
