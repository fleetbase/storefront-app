import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBell, faChevronDown, faLocationDot, faMagnifyingGlass, faStore, faTableCellsLarge } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useStorefront from '../../hooks/use-storefront';
import useCurrentLocation from '../../hooks/use-current-location';
import useCustomerCoordinates from '../../hooks/use-customer-coordinates';
import useSavedLocations from '../../hooks/use-saved-locations';
import useCartSummary from '../../hooks/use-cart-summary';
import { DEFAULT_DISCOVERY_STATE, buildNetworkStoreQuery, mergeNetworkPage } from '../../network/network-runtime';
import { rememberStores } from '../../network/store-names';
import { fetchOffers, type Offer } from '../../commerce/offers';
import { OfferBanner } from '../../components/offers/OfferCard';
import useUnreadNotifications from '../../hooks/use-unread-notifications';
import {
    CartPill,
    categoryIcon,
    ErrorState,
    EmptyState,
    MediaImage,
    SectionHeader,
    IconButton,
    LocationSheet,
    Skeleton,
    StoreCard,
    StoreLogo,
    UIText,
    elevation,
    radius,
    space,
    storeSummary,
    usableImageUrl,
    usesTwelveHourClock,
    type StoreSummary,
} from '../../ui';

const PAGE_SIZE = 20;
const RAIL_SIZE = 8;
const HERO_HEIGHT = 236;
// The search field sits inside the hero, SEARCH_INSET above its bottom edge.
const SEARCH_HEIGHT = 52;
const SEARCH_INSET = 16;
const HEADER_GAP = 22;
const SERVICE_TAGS = ['services'];

type Rail = { key: string; title: string; subtitle?: string; params: Record<string, unknown>; stores: StoreSummary[]; loading: boolean; failed: boolean };

/** Home screen of a Network (marketplace) app: hero, search, categories, curated rails and every store. */
const NetworkHomeScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const heroHeight = HERO_HEIGHT + insets.top;
    const scrollY = useRef(new Animated.Value(0)).current;
    const theme = useTheme();
    const { t, locale } = useLanguage();
    const { storefront } = useStorefront();
    const { network, ownerInfo } = useStorefrontRuntime();
    const { currentLocation, updateCurrentLocation } = useCurrentLocation();
    const { savedLocations } = useSavedLocations();
    const cart = useCartSummary();
    const hour12 = usesTwelveHourClock(locale);

    const { coordinates } = useCustomerCoordinates();
    const summarize = useCallback(
        (stores: any[]) => {
            const summaries = Array.from(stores || []).map((store) => storeSummary(store, { t, hour12 }));
            rememberStores(summaries);
            return summaries;
        },
        [t, hour12]
    );

    const networkName = ownerInfo?.name ?? '';
    const railDefinitions = useMemo(
        () => [
            { key: 'nearby', title: t('Network.sections.nearby'), params: { sort: 'nearest' } },
            { key: 'services', title: t('Network.sections.services'), subtitle: t('Network.sections.servicesSubtitle'), params: { sort: 'nearest', tagged: SERVICE_TAGS } },
            { key: 'topRated', title: t('Network.sections.topRated'), params: { sort: 'highest_rated' } },
            { key: 'newest', title: t('Network.sections.newest', { name: networkName }), params: { sort: 'newest' } },
        ],
        [networkName, t]
    );

    const [rails, setRails] = useState<Rail[]>(() => railDefinitions.map((rail) => ({ ...rail, stores: [], loading: true, failed: false })));
    const [categories, setCategories] = useState<any[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);
    const { count: unread } = useUnreadNotifications();
    const [stores, setStores] = useState<StoreSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [locationSheet, setLocationSheet] = useState(false);
    const requestSequence = useRef(0);
    const storeCount = useRef(0);

    const loadRails = useCallback(async () => {
        if (!network) return;
        setRails(railDefinitions.map((rail) => ({ ...rail, stores: [], loading: true, failed: false })));
        await Promise.all(
            railDefinitions.map(async (rail) => {
                try {
                    const result = await network.getStores({ limit: RAIL_SIZE, with_locations: true, ...(coordinates ? { location: coordinates } : {}), ...rail.params });
                    const summaries = summarize(result);
                    setRails((current) => current.map((item) => (item.key === rail.key ? { ...item, stores: summaries, loading: false } : item)));
                } catch {
                    setRails((current) => current.map((item) => (item.key === rail.key ? { ...item, loading: false, failed: true } : item)));
                }
            })
        );
    }, [coordinates, network, railDefinitions, summarize]);

    const loadStores = useCallback(
        async ({ append = false, refresh = false } = {}) => {
            if (!network) return;
            const sequence = ++requestSequence.current;
            const offset = append ? storeCount.current : 0;
            append ? setLoadingMore(true) : refresh ? setRefreshing(true) : setLoading(true);
            setError(null);
            try {
                const result = await network.getStores({ ...buildNetworkStoreQuery(DEFAULT_DISCOVERY_STATE, offset, coordinates), with_locations: true });
                if (sequence !== requestSequence.current) return;
                const next = summarize(result);
                setStores((current) => {
                    const updated = mergeNetworkPage(current, next, append);
                    storeCount.current = updated.length;
                    return updated;
                });
                setHasMore(next.length === PAGE_SIZE);
            } catch (loadError: any) {
                if (sequence === requestSequence.current) setError(loadError);
            } finally {
                if (sequence === requestSequence.current) {
                    setLoading(false);
                    setRefreshing(false);
                    setLoadingMore(false);
                }
            }
        },
        [coordinates, network, summarize]
    );

    useEffect(() => {
        loadRails();
        loadStores();
        return () => {
            requestSequence.current += 1;
        };
    }, [loadRails, loadStores]);

    useEffect(() => {
        if (!storefront) return;
        let active = true;
        storefront.categories
            .query({ parents_only: true })
            .then((result: any) => active && setCategories(Array.from(result || [])))
            .catch(() => {
                // The category rail is optional; the rest of home stays useful without it.
            });
        return () => {
            active = false;
        };
    }, [storefront]);

    // Live offers for the rail; it hides itself when there are none or they fail to load.
    const loadOffers = useCallback(() => {
        const adapter = storefront?.getAdapter?.();
        if (!adapter) return;
        fetchOffers((path, query) => adapter.get(path, query), { includeScheduled: false })
            .then((list) => setOffers(list.filter((offer) => offer.availability === 'live').slice(0, 8)))
            .catch(() => setOffers([]));
    }, [storefront]);

    useEffect(() => {
        loadOffers();
    }, [loadOffers]);

    const refresh = useCallback(() => {
        loadOffers();
        loadRails();
        loadStores({ refresh: true });
    }, [loadOffers, loadRails, loadStores]);

    const openStore = useCallback((store: StoreSummary) => navigation.navigate('NetworkStore', { storeId: store.id }), [navigation]);
    const openDirectory = useCallback((params: Record<string, unknown> = {}) => navigation.navigate('NetworkCategory', params), [navigation]);

    const locationName = currentLocation?.getAttribute?.('name');
    const locationLine = [locationName, currentLocation?.getAttribute?.('street1')].filter(Boolean).join(' · ');

    const header = (
        <YStack gap={HEADER_GAP} paddingBottom={6}>
            <YStack height={heroHeight}>
                {/* Pulled past the top, the backdrop grows from its top edge to fill the space while the header content moves down. */}
                <Animated.View
                    pointerEvents='none'
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: heroHeight,
                        transform: [
                            { translateY: scrollY.interpolate({ inputRange: [-heroHeight, 0], outputRange: [-heroHeight / 2, 0], extrapolateRight: 'clamp' }) },
                            { scale: scrollY.interpolate({ inputRange: [-heroHeight, 0], outputRange: [2, 1], extrapolateRight: 'clamp' }) },
                        ],
                    }}
                >
                    <MediaImage uri={usableImageUrl(ownerInfo?.backdrop_url)} seed={networkName} height={heroHeight} radius={0} />
                    <LinearGradient
                        colors={['rgba(10,14,20,0.45)', 'rgba(10,14,20,0.05)', 'rgba(10,14,20,0.72)']}
                        locations={[0, 0.38, 1]}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                </Animated.View>
                <XStack position='absolute' top={insets.top + 10} left={space.gutter} right={space.gutter} alignItems='center' justifyContent='space-between' gap={10}>
                    <Pressable
                        onPress={() => setLocationSheet(true)}
                        accessibilityRole='button'
                        accessibilityLabel={locationLine ? t('Network.changeLocation', { place: locationLine }) : t('Network.setLocation')}
                        style={{
                            maxWidth: '82%',
                            height: 40,
                            paddingHorizontal: 12,
                            borderRadius: radius.pill,
                            backgroundColor: 'rgba(255,255,255,0.94)',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            ...elevation.floating,
                        }}
                    >
                        <FontAwesomeIcon icon={faLocationDot} size={14} color='#14171c' />
                        <UIText variant='captionStrong' style={{ color: '#14171c', flexShrink: 1 }} numberOfLines={1}>
                            {locationLine || t('Network.setLocation')}
                        </UIText>
                        <FontAwesomeIcon icon={faChevronDown} size={11} color='#14171c' />
                    </Pressable>
                    <IconButton
                        icon={faBell}
                        variant='floating'
                        badge={unread > 0 ? (unread > 9 ? '9+' : String(unread)) : undefined}
                        accessibilityLabel={unread > 0 ? t('Notifications.bellUnread', { count: unread }) : t('Notifications.title')}
                        onPress={() => navigation.navigate('Notifications')}
                    />
                </XStack>
                <XStack position='absolute' left={space.gutter} right={space.gutter} bottom={SEARCH_HEIGHT + SEARCH_INSET * 2} alignItems='flex-end' gap={12}>
                    <StoreLogo uri={usableImageUrl(ownerInfo?.logo_url)} name={networkName} size={56} />
                    <YStack flex={1} gap={2}>
                        <UIText variant='title' tone='onImage' accessibilityRole='header' numberOfLines={1}>
                            {networkName}
                        </UIText>
                        {!!ownerInfo?.description && (
                            <UIText variant='caption' tone='onImage' numberOfLines={2} style={{ opacity: 0.92 }}>
                                {ownerInfo.description}
                            </UIText>
                        )}
                    </YStack>
                </XStack>
            </YStack>

            <Pressable
                onPress={() => navigation.navigate('NetworkSearchTab')}
                accessibilityRole='search'
                accessibilityLabel={t('Network.searchEverything')}
                style={{
                    marginTop: -(HEADER_GAP + SEARCH_HEIGHT + SEARCH_INSET),
                    marginBottom: 8,
                    marginHorizontal: space.gutter,
                    height: SEARCH_HEIGHT,
                    borderRadius: radius.button,
                    backgroundColor: theme.background.val,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 14,
                    ...elevation.sheet,
                }}
            >
                <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color={theme.textSecondary.val} />
                <UIText tone='secondary'>{t('Network.searchEverything')}</UIText>
            </Pressable>

            {categories.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 8 }}
                    accessibilityLabel={t('Network.categoriesLabel')}
                >
                    <CategoryTile label={t('Network.allCategoriesShort')} selected onPress={() => openDirectory()} />
                    {categories.map((category: any) => (
                        <CategoryTile
                            key={category.id}
                            label={category.getAttribute('name')}
                            iconUrl={usableImageUrl(category.getAttribute('icon_url'))}
                            onPress={() => openDirectory({ categoryId: category.id, category: { id: category.id, name: category.getAttribute('name') } })}
                        />
                    ))}
                </ScrollView>
            )}

            {offers.length > 0 && (
                <YStack gap={12}>
                    <SectionHeader title={t('Offers.title')} onAction={() => navigation.navigate('Offers')} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 12 }}>
                        {offers.map((offer, index) => (
                            <OfferBanner key={offer.id} offer={offer} primary={index === 0} width={304} onPress={() => navigation.navigate('Offer', { offerId: offer.id })} />
                        ))}
                    </ScrollView>
                </YStack>
            )}

            {rails.map((rail) =>
                !rail.loading && (rail.failed || rail.stores.length === 0) ? null : (
                    <YStack key={rail.key} gap={12}>
                        <SectionHeader title={rail.title} subtitle={rail.subtitle} onAction={() => openDirectory({ sort: rail.params.sort, tags: rail.params.tagged })} />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 14 }}>
                            {rail.loading
                                ? [0, 1].map((index) => <HeroCardSkeleton key={index} />)
                                : rail.stores.map((store) => <StoreCard key={store.id ?? store.name} store={store} width={268} onPress={() => openStore(store)} />)}
                        </ScrollView>
                    </YStack>
                )
            )}

            <SectionHeader title={t('Network.sections.allStores')} onAction={() => openDirectory()} />
        </YStack>
    );

    return (
        <YStack flex={1} backgroundColor='$background'>
            <Animated.FlatList
                data={stores}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: Platform.OS !== 'web' })}
                scrollEventThrottle={16}
                keyExtractor={(item, index) => item.id ?? String(index)}
                renderItem={({ item }) => (
                    <YStack paddingHorizontal={space.gutter}>
                        <StoreCard store={item} variant='compact' onPress={() => openStore(item)} />
                    </YStack>
                )}
                ListHeaderComponent={header}
                contentContainerStyle={{ paddingBottom: cart.count > 0 ? 100 : 32 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor='#ffffff' />}
                onEndReached={() => hasMore && !loadingMore && !loading && loadStores({ append: true })}
                onEndReachedThreshold={0.5}
                ListFooterComponent={loadingMore ? <CompactSkeleton /> : null}
                // FlatList clones the empty element with an array style; a plain View accepts it on web.
                ListEmptyComponent={
                    <View>
                        {loading ? (
                            [0, 1, 2].map((index) => <CompactSkeleton key={index} />)
                        ) : error ? (
                            <ErrorState onRetry={() => loadStores()} />
                        ) : (
                            <EmptyState icon={faStore} title={t('Network.noStores')} description={t('Network.noStoresDescription')} />
                        )}
                    </View>
                }
            />
            <CartPill count={cart.count} total={cart.total} storeName={cart.storeName} onPress={() => navigation.navigate('NetworkCartTab')} />
            <LocationSheet
                open={locationSheet}
                onClose={() => setLocationSheet(false)}
                savedLocations={savedLocations}
                current={currentLocation}
                onSelect={(place: any) => {
                    updateCurrentLocation(place);
                    setLocationSheet(false);
                }}
            />
        </YStack>
    );
};

function CategoryTile({ label, iconUrl, selected = false, onPress }: { label: string; iconUrl?: string | null; selected?: boolean; onPress: () => void }) {
    const theme = useTheme();
    return (
        <Pressable onPress={onPress} accessibilityRole='button' accessibilityLabel={label} style={{ width: 76, alignItems: 'center', gap: 6, paddingVertical: 4 }}>
            <YStack width={60} height={60} borderRadius={radius.tile} alignItems='center' justifyContent='center' backgroundColor={selected ? '$primarySoft' : '$surface'}>
                {iconUrl ? (
                    <Image source={{ uri: iconUrl }} style={{ width: 30, height: 30 }} resizeMode='contain' />
                ) : (
                    <FontAwesomeIcon icon={selected ? faTableCellsLarge : categoryIcon(label)} size={22} color={selected ? theme.primaryForeground.val : theme.textPrimary.val} />
                )}
            </YStack>
            <UIText variant='caption' textAlign='center' numberOfLines={2} style={{ fontWeight: selected ? '700' : '500' }}>
                {label}
            </UIText>
        </Pressable>
    );
}

function HeroCardSkeleton() {
    return (
        <YStack width={268} gap={10}>
            <Skeleton height={132} radius={radius.card} />
            <XStack gap={10}>
                <Skeleton width={40} height={40} radius={radius.tile} />
                <YStack flex={1} gap={8}>
                    <Skeleton height={14} width='70%' />
                    <Skeleton height={12} width='45%' />
                </YStack>
            </XStack>
        </YStack>
    );
}

function CompactSkeleton() {
    return (
        <XStack paddingHorizontal={space.gutter} paddingVertical={10} gap={12} alignItems='center'>
            <Skeleton width={64} height={64} radius={radius.tile} />
            <YStack flex={1} gap={8}>
                <Skeleton height={14} width='60%' />
                <Skeleton height={12} width='40%' />
            </YStack>
        </XStack>
    );
}

export default NetworkHomeScreen;
