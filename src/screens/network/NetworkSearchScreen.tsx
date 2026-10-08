import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Product, Store } from '@fleetbase/storefront';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCalendarCheck, faClockRotateLeft, faMagnifyingGlass, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useStorefront from '../../hooks/use-storefront';
import useStorage from '../../hooks/use-storage';
import useCustomerCoordinates from '../../hooks/use-customer-coordinates';
import { formatCurrency } from '../../utils/format';
import { getScopedStorageKey, serializeSdkResource } from '../../network/network-runtime';
import { rememberStores } from '../../network/store-names';
import { addRecentSearch, removeRecentSearch } from '../../network/recent-searches';
import {
    Badge,
    Chip,
    EmptyState,
    ErrorState,
    IconButton,
    MediaImage,
    Skeleton,
    StoreCard,
    UIText,
    categoryIcon,
    productSummary,
    radius,
    space,
    storeSummary,
    usesTwelveHourClock,
    type ProductSummary,
    type StoreSummary,
} from '../../ui';

const DEBOUNCE_MS = 300;
type Tab = 'all' | 'stores' | 'products' | 'services';
type Results = { query: string; stores: StoreSummary[]; products: Array<{ summary: ProductSummary; resource: any }> };

/**
 * Search across every store in the Network. Before typing it offers recent searches,
 * popular tags and categories; results stay on screen while the next query loads.
 */
const NetworkSearchScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t, locale } = useLanguage();
    const { storefront } = useStorefront();
    const { network, ownerInfo, enterStore, getSelectedStoreLocation } = useStorefrontRuntime();
    const [recents, setRecents] = useStorage<string[]>(getScopedStorageKey(ownerInfo?.id ?? 'unconfigured', 'recent-searches'), []);
    const [query, setQuery] = useState('');
    const [tab, setTab] = useState<Tab>('all');
    const [results, setResults] = useState<Results | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [retry, setRetry] = useState(0);
    const [tags, setTags] = useState<string[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const requestId = useRef(0);
    const hour12 = usesTwelveHourClock(locale);
    const { coordinates } = useCustomerCoordinates();
    const trimmed = query.trim();

    useEffect(() => {
        if (!network || !storefront) return;
        let active = true;
        Promise.allSettled([network.getTags(), storefront.categories.query({ parents_only: true })]).then(([tagResult, categoryResult]) => {
            if (!active) return;
            if (tagResult.status === 'fulfilled')
                setTags(
                    Array.from(tagResult.value || [])
                        .filter((tag): tag is string => typeof tag === 'string')
                        .slice(0, 10)
                );
            if (categoryResult.status === 'fulfilled') setCategories(Array.from(categoryResult.value || []));
        });
        return () => {
            active = false;
        };
    }, [network, storefront]);

    useEffect(() => {
        if (!trimmed || !storefront || !network) {
            requestId.current += 1;
            setLoading(false);
            setError(null);
            if (!trimmed) setResults(null);
            return;
        }
        const timeout = setTimeout(async () => {
            const current = ++requestId.current;
            setLoading(true);
            setError(null);
            try {
                const [productResponse, storeResponse] = await Promise.all([
                    storefront.search(trimmed, { with_store: true, limit: 30 }),
                    network.getStores({ query: trimmed, limit: 10, with_locations: true, ...(coordinates ? { location: coordinates } : {}) }),
                ]);
                if (current !== requestId.current) return;
                // Rehydrate: Storefront JS <=1.1.14 search results do not keep the adapter.
                const products = Array.from(productResponse || []).map((product: any) => {
                    const resource = new Product(serializeSdkResource(product), storefront.getAdapter());
                    return { summary: productSummary(resource), resource };
                });
                const stores = Array.from(storeResponse || []).map((store: any) => storeSummary(store, { t, hour12 }));
                rememberStores(stores);
                setResults({ query: trimmed, stores, products });
            } catch (searchError: any) {
                if (current === requestId.current) setError(searchError);
            } finally {
                if (current === requestId.current) setLoading(false);
            }
        }, DEBOUNCE_MS);
        return () => clearTimeout(timeout);
    }, [coordinates, hour12, network, retry, storefront, t, trimmed]);

    const remember = useCallback((term: string) => setRecents(addRecentSearch(recents, term)), [recents, setRecents]);

    const openStore = (store: StoreSummary) => {
        remember(trimmed);
        navigation.navigate('NetworkStore', { storeId: store.id });
    };

    const openProduct = ({ resource }: { resource: any }) => {
        remember(trimmed);
        const merchantData = resource.getAttribute('store');
        if (!merchantData) return;
        const merchant = new Store(merchantData, storefront?.getAdapter());
        enterStore(merchant);
        navigation.navigate('Product', {
            product: resource.serialize(),
            productId: resource.id,
            store: merchant.serialize(),
            storeId: merchant.id,
            storeLocationId: getSelectedStoreLocation(merchant.id)?.id,
        });
    };

    const tabs: Array<{ key: Tab; label: string }> = [
        { key: 'all', label: t('Network.searchTabs.all') },
        { key: 'stores', label: t('Network.searchTabs.stores') },
        { key: 'products', label: t('Network.searchTabs.products') },
        { key: 'services', label: t('Network.searchTabs.services') },
    ];

    const visible = useMemo(() => {
        if (!results) return { stores: [], products: [] };
        const products = results.products.filter(({ summary }) => (tab === 'products' ? !summary.isService : tab === 'services' ? summary.isService : tab === 'all'));
        return { stores: tab === 'all' || tab === 'stores' ? results.stores : [], products };
    }, [results, tab]);

    const showingResults = !!trimmed && (results !== null || error !== null || loading);
    const firstLoad = loading && results === null;
    const noResults = results !== null && !loading && !error && results.stores.length === 0 && results.products.length === 0;

    const rows = [
        ...(visible.stores.length ? [{ key: 'stores-header', type: 'header' as const, title: t('Network.searchTabs.stores') }] : []),
        ...visible.stores.map((store) => ({ key: `store-${store.id}`, type: 'store' as const, store })),
        ...(visible.products.length
            ? [{ key: 'products-header', type: 'header' as const, title: tab === 'services' ? t('Network.searchTabs.services') : t('Network.productsAndServices') }]
            : []),
        ...visible.products.map((product) => ({ key: `product-${product.summary.id}`, type: 'product' as const, product })),
    ];

    return (
        <YStack flex={1} backgroundColor='$background' paddingTop={insets.top}>
            <YStack paddingHorizontal={space.gutter} paddingTop={6} gap={10} backgroundColor='$background' borderBottomWidth={showingResults ? 1 : 0} borderColor='$borderColor'>
                <XStack
                    alignItems='center'
                    gap={10}
                    height={48}
                    paddingLeft={14}
                    paddingRight={6}
                    borderRadius={radius.button}
                    backgroundColor='$surface'
                    borderWidth={2}
                    borderColor={trimmed ? '$primaryForeground' : 'transparent'}
                >
                    <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color={theme.textSecondary.val} />
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={() => remember(trimmed)}
                        placeholder={t('Network.searchEverything')}
                        placeholderTextColor={theme.textPlaceholder.val}
                        accessibilityLabel={t('Network.searchEverything')}
                        autoCapitalize='none'
                        autoCorrect={false}
                        returnKeyType='search'
                        // The field's border shows focus, so drop the browser's own outline on web.
                        style={{
                            flex: 1,
                            fontSize: 16,
                            fontWeight: '500',
                            color: theme.textPrimary.val,
                            paddingVertical: 0,
                            ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
                        }}
                    />
                    {!!query && <IconButton icon={faXmark} size={32} accessibilityLabel={t('Network.clearSearch')} onPress={() => setQuery('')} />}
                </XStack>
                {showingResults && (
                    <XStack accessibilityRole='tablist' gap={6} paddingBottom={10}>
                        {tabs.map((item) => (
                            <Chip key={item.key} label={item.label} selected={tab === item.key} appearance='inverse' onPress={() => setTab(item.key)} />
                        ))}
                    </XStack>
                )}
                {loading && results !== null && <ProgressLine />}
            </YStack>

            {!showingResults ? (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ padding: space.gutter, gap: 24, paddingBottom: 40 }}
                    keyboardShouldPersistTaps='handled'
                >
                    {recents.length > 0 && (
                        <YStack>
                            <XStack alignItems='center' justifyContent='space-between'>
                                <UIText variant='subheading' accessibilityRole='header'>
                                    {t('Network.recentSearches')}
                                </UIText>
                                <UIText variant='bodyStrong' tone='brand' accessibilityRole='button' onPress={() => setRecents([])} style={{ paddingVertical: 10 }}>
                                    {t('Network.clearRecents')}
                                </UIText>
                            </XStack>
                            {recents.map((term) => (
                                <XStack key={term} alignItems='center' gap={12} minHeight={48}>
                                    <FontAwesomeIcon icon={faClockRotateLeft} size={16} color={theme.textSecondary.val} />
                                    <Pressable onPress={() => setQuery(term)} accessibilityRole='button' style={{ flex: 1, paddingVertical: 12 }}>
                                        <UIText>{term}</UIText>
                                    </Pressable>
                                    <IconButton
                                        icon={faXmark}
                                        variant='plain'
                                        size={36}
                                        accessibilityLabel={t('Network.removeRecent', { term })}
                                        onPress={() => setRecents(removeRecentSearch(recents, term))}
                                    />
                                </XStack>
                            ))}
                        </YStack>
                    )}
                    {tags.length > 0 && (
                        <YStack gap={12}>
                            <UIText variant='subheading' accessibilityRole='header'>
                                {t('Network.popularOn', { name: ownerInfo?.name ?? '' })}
                            </UIText>
                            <XStack flexWrap='wrap' gap={8}>
                                {tags.map((tag) => (
                                    <Chip key={tag} label={tag} appearance='filled' onPress={() => navigation.navigate('NetworkCategory', { tags: [tag] })} />
                                ))}
                            </XStack>
                        </YStack>
                    )}
                    {categories.length > 0 && (
                        <YStack gap={12}>
                            <UIText variant='subheading' accessibilityRole='header'>
                                {t('Network.browseCategories')}
                            </UIText>
                            <XStack flexWrap='wrap' gap={10}>
                                {categories.map((category: any) => (
                                    <Pressable
                                        key={category.id}
                                        onPress={() =>
                                            navigation.navigate('NetworkCategory', { categoryId: category.id, category: { id: category.id, name: category.getAttribute('name') } })
                                        }
                                        accessibilityRole='button'
                                        style={{
                                            width: '31%',
                                            minWidth: 100,
                                            height: 88,
                                            borderRadius: radius.card,
                                            padding: 12,
                                            justifyContent: 'space-between',
                                            backgroundColor: theme.surface.val,
                                        }}
                                    >
                                        <FontAwesomeIcon icon={categoryIcon(category.getAttribute('name'))} size={18} color={theme.primaryForeground.val} />
                                        <UIText variant='captionStrong' numberOfLines={2}>
                                            {category.getAttribute('name')}
                                        </UIText>
                                    </Pressable>
                                ))}
                            </XStack>
                        </YStack>
                    )}
                </ScrollView>
            ) : (
                <FlatList
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    data={error || firstLoad || noResults ? [] : rows}
                    keyExtractor={(item) => item.key}
                    keyboardShouldPersistTaps='handled'
                    contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 40 }}
                    renderItem={({ item }) => {
                        if (item.type === 'header') {
                            return (
                                <UIText variant='subheading' accessibilityRole='header' style={{ marginTop: 16, marginBottom: 4 }}>
                                    {item.title}
                                </UIText>
                            );
                        }
                        if (item.type === 'store') {
                            return <StoreCard store={item.store} variant='compact' onPress={() => openStore(item.store)} />;
                        }
                        return <ProductResultRow product={item.product.summary} onPress={() => openProduct(item.product)} />;
                    }}
                    ListEmptyComponent={
                        <View>
                            {error ? (
                                <ErrorState description={t('Network.searchError')} onRetry={() => setRetry((value) => value + 1)} />
                            ) : firstLoad ? (
                                [0, 1, 2, 3].map((index) => <ResultSkeleton key={index} />)
                            ) : noResults ? (
                                <YStack>
                                    <EmptyState icon={faMagnifyingGlass} title={t('Network.noResultsFor', { query: results?.query ?? trimmed })} description={t('Network.noResultsHint')} />
                                    {tags.length > 0 && (
                                        <XStack flexWrap='wrap' gap={8} justifyContent='center' paddingHorizontal={24}>
                                            {tags.slice(0, 6).map((tag) => (
                                                <Chip key={tag} label={tag} appearance='filled' onPress={() => setQuery(tag)} />
                                            ))}
                                        </XStack>
                                    )}
                                </YStack>
                            ) : (
                                <UIText tone='secondary' textAlign='center' style={{ marginTop: 32 }}>
                                    {t('Network.noResultsInTab')}
                                </UIText>
                            )}
                        </View>
                    }
                />
            )}
        </YStack>
    );
};

function ProductResultRow({ product, onPress }: { product: ProductSummary; onPress: () => void }) {
    const { t } = useLanguage();
    const theme = useTheme();
    const price = formatCurrency(product.onSale ? product.salePrice! : product.price, product.currency ?? 'USD');
    const was = product.onSale ? formatCurrency(product.price, product.currency ?? 'USD') : null;

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole='button'
            accessibilityLabel={[
                product.name,
                product.isService ? t('Network.bookableService') : null,
                price,
                product.storeName ? t('Network.fromStore', { store: product.storeName }) : null,
            ]
                .filter(Boolean)
                .join(', ')}
            style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                minHeight: 84,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderColor: theme.borderColor.val,
                opacity: pressed ? 0.85 : 1,
            })}
        >
            <MediaImage uri={product.imageUrl} seed={product.name} width={68} height={68} radius={radius.tile} dimmed={!product.available} />
            <YStack flex={1} gap={3}>
                <UIText variant='bodyStrong' numberOfLines={2}>
                    {product.name}
                </UIText>
                {product.isService && <Badge tone='brand' size='sm' icon={faCalendarCheck} label={t('Network.bookableService')} />}
                {!!product.storeName && (
                    <UIText variant='caption' tone='secondary' numberOfLines={1}>
                        {t('Network.fromStore', { store: product.storeName })}
                    </UIText>
                )}
                <XStack gap={6} alignItems='baseline'>
                    <UIText variant='captionStrong' tone={product.onSale ? 'error' : 'primary'}>
                        {price}
                    </UIText>
                    {was && (
                        <UIText variant='caption' tone='secondary' style={{ textDecorationLine: 'line-through' }}>
                            {was}
                        </UIText>
                    )}
                </XStack>
            </YStack>
            <YStack width={36} height={36} borderRadius={18} backgroundColor='$surface' alignItems='center' justifyContent='center' accessibilityElementsHidden>
                <FontAwesomeIcon icon={faPlus} size={14} color={theme.textPrimary.val} />
            </YStack>
        </Pressable>
    );
}

function ResultSkeleton() {
    return (
        <XStack gap={12} paddingVertical={10} alignItems='center'>
            <Skeleton width={68} height={68} radius={radius.tile} />
            <YStack flex={1} gap={8}>
                <Skeleton height={14} width='70%' />
                <Skeleton height={12} width='45%' />
            </YStack>
        </XStack>
    );
}

/** A thin bar under the search field while a newer query loads over existing results. */
function ProgressLine() {
    return (
        <YStack height={2} marginHorizontal={-space.gutter} backgroundColor='$borderColor' overflow='hidden' accessibilityRole='progressbar'>
            <YStack width='40%' height={2} backgroundColor='$primaryForeground' />
        </YStack>
    );
}

export default NetworkSearchScreen;
