import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { faArrowDownWideShort, faChevronLeft, faMagnifyingGlass, faSliders, faStore } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useStorefront from '../../hooks/use-storefront';
import useCustomerCoordinates from '../../hooks/use-customer-coordinates';
import useCartSummary from '../../hooks/use-cart-summary';
import { mergeNetworkPage } from '../../network/network-runtime';
import { rememberStores } from '../../network/store-names';
import { Button, CartPill, Chip, EmptyState, ErrorState, IconButton, SegmentedControl, Sheet, Skeleton, StoreCard, UIText, radius, space, storeSummary, usesTwelveHourClock, type StoreSummary } from '../../ui';
import { activeFilterCount, buildDirectoryQuery, DEFAULT_DIRECTORY_FILTERS, DIRECTORY_DISTANCES, DIRECTORY_SORTS, type DirectoryFilters } from '../../network/directory';

const PAGE_SIZE = 20;

/**
 * Every store in the Network, or one category's, with sorting and filters. Opened from
 * a category tile or a "See all" link on home, which can preset the sort and tags.
 */
const NetworkDirectoryScreen = ({ route }: any) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t, locale } = useLanguage();
    const { storefront } = useStorefront();
    const { network } = useStorefrontRuntime();
    const cart = useCartSummary();
    const params = route?.params ?? {};
    const hour12 = usesTwelveHourClock(locale);

    const [category, setCategory] = useState<{ id: string; name: string } | null>(params.category ?? null);
    const [filters, setFilters] = useState<DirectoryFilters>(() => ({
        ...DEFAULT_DIRECTORY_FILTERS,
        sort: DIRECTORY_SORTS.includes(params.sort) ? params.sort : DEFAULT_DIRECTORY_FILTERS.sort,
        tags: Array.isArray(params.tags) ? params.tags : params.tag ? [params.tag] : [],
    }));
    const [draft, setDraft] = useState<DirectoryFilters>(filters);
    const [sheet, setSheet] = useState<'sort' | 'filters' | null>(null);
    const [tags, setTags] = useState<string[]>([]);
    const [stores, setStores] = useState<StoreSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const requestId = useRef(0);
    const count = useRef(0);

    const categoryId = params.categoryId ?? category?.id ?? null;
    const { coordinates } = useCustomerCoordinates();

    // Resolve the category name when opened from a deep link with only an id.
    useEffect(() => {
        if (!storefront || !categoryId || category) return;
        let active = true;
        storefront.categories
            .query({ parents_only: true })
            .then((result: any) => {
                const match = Array.from(result || []).find((item: any) => item.id === categoryId) as any;
                if (active && match) setCategory({ id: match.id, name: match.getAttribute('name') });
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [category, categoryId, storefront]);

    useEffect(() => {
        if (!network) return;
        let active = true;
        network
            .getTags()
            .then((result: any) => active && setTags(Array.from(result || []).filter((tag): tag is string => typeof tag === 'string')))
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [network]);

    const load = useCallback(
        async ({ append = false, refresh = false } = {}) => {
            if (!network) return;
            const current = ++requestId.current;
            append ? setLoadingMore(true) : refresh ? setRefreshing(true) : setLoading(true);
            setError(null);
            try {
                const result = await network.getStores(buildDirectoryQuery(filters, { categoryId, coordinates, offset: append ? count.current : 0, limit: PAGE_SIZE }));
                if (current !== requestId.current) return;
                const next = Array.from(result || []).map((store) => storeSummary(store, { t, hour12 }));
                rememberStores(next);
                setStores((existing) => {
                    const merged = mergeNetworkPage(existing, next, append);
                    count.current = merged.length;
                    return merged;
                });
                setHasMore(next.length === PAGE_SIZE);
            } catch (loadError: any) {
                if (current === requestId.current) setError(loadError);
            } finally {
                if (current === requestId.current) {
                    setLoading(false);
                    setRefreshing(false);
                    setLoadingMore(false);
                }
            }
        },
        [categoryId, coordinates, filters, hour12, network, t]
    );

    useEffect(() => {
        load();
        return () => {
            requestId.current += 1;
        };
    }, [load]);

    const openSheet = (which: 'sort' | 'filters') => {
        setDraft(filters);
        setSheet(which);
    };
    const applyDraft = () => {
        setFilters(draft);
        setSheet(null);
    };

    const filterCount = activeFilterCount(filters);
    const title = category?.name ?? t('Network.sections.allStores');
    const subtitle = loading && stores.length === 0 ? '' : t('Network.directory.summary', { count: stores.length, sort: t(`Network.sort.${filters.sort}`) });

    const header = (
        <YStack paddingTop={insets.top} backgroundColor='$background' borderBottomWidth={1} borderColor='$borderColor'>
            <XStack alignItems='center' gap={8} paddingHorizontal={8} paddingVertical={6}>
                <IconButton icon={faChevronLeft} variant='plain' accessibilityLabel={t('UI.back')} onPress={() => navigation.goBack()} size={44} />
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
                <IconButton icon={faMagnifyingGlass} accessibilityLabel={t('Network.directory.search', { name: title })} onPress={() => navigation.navigate('NetworkSearchTab')} size={44} />
            </XStack>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 12, gap: 8 }}>
                <Chip icon={faArrowDownWideShort} label={t(`Network.sort.${filters.sort}`)} onPress={() => openSheet('sort')} />
                <Chip icon={faSliders} label={filterCount > 0 ? t('Network.directory.filtersCount', { count: filterCount }) : t('Network.directory.filters')} selected={filterCount > 0} onPress={() => openSheet('filters')} />
                {filters.openNow && <Chip appearance='filled' label={t('Network.openNow')} onRemove={() => setFilters({ ...filters, openNow: false })} />}
                {filters.maximumDistance !== null && (
                    <Chip appearance='filled' label={t('Network.directory.within', { distance: filters.maximumDistance / 1000 })} onRemove={() => setFilters({ ...filters, maximumDistance: null })} />
                )}
                {filters.tags.map((tag) => (
                    <Chip key={tag} appearance='filled' label={tag} onRemove={() => setFilters({ ...filters, tags: filters.tags.filter((item) => item !== tag) })} />
                ))}
            </ScrollView>
        </YStack>
    );

    return (
        <YStack flex={1} backgroundColor='$background'>
            {header}
            <FlatList
                data={stores}
                keyExtractor={(item, index) => item.id ?? String(index)}
                renderItem={({ item }) => (
                    <YStack paddingHorizontal={space.gutter} paddingTop={16}>
                        <StoreCard store={item} onPress={() => navigation.navigate('NetworkStore', { storeId: item.id })} />
                    </YStack>
                )}
                contentContainerStyle={{ paddingBottom: cart.count > 0 ? 100 : 32 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ refresh: true })} />}
                onEndReached={() => hasMore && !loading && !loadingMore && load({ append: true })}
                onEndReachedThreshold={0.5}
                ListFooterComponent={loadingMore ? <HeroSkeleton /> : null}
                ListEmptyComponent={
                    <View>
                        {loading ? (
                            [0, 1].map((index) => <HeroSkeleton key={index} />)
                        ) : error ? (
                            <ErrorState onRetry={() => load()} />
                        ) : (
                            <EmptyState
                                icon={faStore}
                                title={t('Network.noStores')}
                                description={filterCount > 0 ? t('Network.directory.noMatches') : t('Network.noCategoryStores')}
                                actionLabel={filterCount > 0 ? t('Network.directory.clearFilters') : undefined}
                                onAction={() => setFilters({ ...DEFAULT_DIRECTORY_FILTERS, sort: filters.sort })}
                            />
                        )}
                    </View>
                }
            />
            <CartPill count={cart.count} total={cart.total} storeName={cart.storeName} onPress={() => navigation.navigate('NetworkCartTab')} />

            <Sheet
                open={sheet !== null}
                onClose={() => setSheet(null)}
                title={sheet === 'sort' ? t('Network.directory.sortBy') : t('Network.directory.filters')}
                footer={
                    <XStack gap={10}>
                        {sheet === 'filters' && (
                            <YStack flex={1}>
                                <Button variant='outline' fullWidth onPress={() => setDraft({ ...DEFAULT_DIRECTORY_FILTERS, sort: draft.sort })}>
                                    {t('Network.directory.clearAll')}
                                </Button>
                            </YStack>
                        )}
                        <YStack flex={2}>
                            <Button fullWidth onPress={applyDraft}>
                                {t('Network.directory.apply')}
                            </Button>
                        </YStack>
                    </XStack>
                }
            >
                {sheet === 'sort' ? (
                    <YStack>
                        {DIRECTORY_SORTS.map((sort) => {
                            const selected = draft.sort === sort;
                            return (
                                <Pressable
                                    key={sort}
                                    onPress={() => setDraft({ ...draft, sort })}
                                    accessibilityRole='radio'
                                    accessibilityState={{ selected }}
                                    style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: theme.borderColor.val }}
                                >
                                    <UIText variant={selected ? 'bodyStrong' : 'body'}>{t(`Network.sort.${sort}`)}</UIText>
                                    <YStack width={22} height={22} borderRadius={11} borderWidth={2} borderColor={selected ? '$primaryForeground' : '$borderColorWithShadow'} alignItems='center' justifyContent='center'>
                                        {selected && <YStack width={10} height={10} borderRadius={5} backgroundColor='$primaryForeground' />}
                                    </YStack>
                                </Pressable>
                            );
                        })}
                    </YStack>
                ) : (
                    <YStack gap={22}>
                        {tags.length > 0 && (
                            <YStack gap={10}>
                                <UIText variant='label' tone='secondary'>
                                    {t('Network.directory.tags')}
                                </UIText>
                                <XStack flexWrap='wrap' gap={8}>
                                    {tags.map((tag) => {
                                        const selected = draft.tags.includes(tag);
                                        return <Chip key={tag} label={tag} selected={selected} onPress={() => setDraft({ ...draft, tags: selected ? draft.tags.filter((item) => item !== tag) : [...draft.tags, tag] })} />;
                                    })}
                                </XStack>
                            </YStack>
                        )}
                        <XStack alignItems='center' justifyContent='space-between' minHeight={44}>
                            <UIText variant='bodyStrong' nativeID='open-now-label'>
                                {t('Network.openNow')}
                            </UIText>
                            <Switch value={draft.openNow} onValueChange={(openNow) => setDraft({ ...draft, openNow })} accessibilityLabelledBy='open-now-label' trackColor={{ true: theme.primary.val, false: theme.borderColorWithShadow.val }} />
                        </XStack>
                        <YStack gap={10}>
                            <UIText variant='label' tone='secondary'>
                                {t('Network.directory.distance')}
                            </UIText>
                            <SegmentedControl
                                accessibilityLabel={t('Network.directory.distance')}
                                value={draft.maximumDistance === null ? 'any' : String(draft.maximumDistance)}
                                onChange={(value) => setDraft({ ...draft, maximumDistance: value === 'any' ? null : Number(value) })}
                                options={[
                                    ...DIRECTORY_DISTANCES.map((meters) => ({ value: String(meters), label: t('Network.directory.km', { distance: meters / 1000 }) })),
                                    { value: 'any', label: t('Network.directory.anyDistance') },
                                ]}
                            />
                            {!coordinates && (
                                <UIText variant='caption' tone='secondary'>
                                    {t('Network.directory.distanceNeedsLocation')}
                                </UIText>
                            )}
                        </YStack>
                    </YStack>
                )}
            </Sheet>
        </YStack>
    );
};

function HeroSkeleton() {
    return (
        <YStack paddingHorizontal={space.gutter} paddingTop={16} gap={10}>
            <Skeleton height={132} radius={radius.card} />
            <XStack gap={10}>
                <Skeleton width={40} height={40} radius={radius.tile} />
                <YStack flex={1} gap={8}>
                    <Skeleton height={14} width='60%' />
                    <Skeleton height={12} width='40%' />
                </YStack>
            </XStack>
        </YStack>
    );
}

export default NetworkDirectoryScreen;
