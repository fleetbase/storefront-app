import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, TextInput, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faClockRotateLeft, faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';
import useStorefront from '../hooks/use-storefront';
import useStorefrontInfo from '../hooks/use-storefront-info';
import useStorage from '../hooks/use-storage';
import { getScopedStorageKey } from '../network/network-runtime';
import { addRecentSearch, removeRecentSearch } from '../network/recent-searches';
import { Chip, EmptyState, ErrorState, IconButton, ProductRow, Skeleton, UIText, productSummary, radius, space } from '../ui';

const SEARCH_DELAY_MS = 300;

/**
 * Search within a single store. Before typing: recent searches and the store's popular
 * categories. While typing: matching products; earlier results stay up while new ones load,
 * and a skeleton shows only for the first search.
 */
const StoreSearchScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t } = useLanguage();
    const { storefront } = useStorefront();
    const { info } = useStorefrontInfo();
    const { getSelectedStoreLocation } = useStorefrontRuntime();
    const [recents, setRecents] = useStorage<string[]>(getScopedStorageKey(info?.id ?? 'unconfigured', 'recent-searches'), []);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [retry, setRetry] = useState(0);
    const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
    const latest = useRef(0);
    const trimmed = query.trim();

    useEffect(() => {
        if (!storefront) return;
        let active = true;
        storefront.categories
            .findAll()
            .then((result: any) => {
                if (!active) return;
                const list = (Array.from(result || []) as any[]).map((category) => ({ id: category.id, name: category.getAttribute('name') })).filter((category) => category.name);
                setCategories(list.slice(0, 8));
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [storefront]);

    useEffect(() => {
        if (!trimmed || !storefront) {
            setLoading(false);
            setFailed(false);
            if (!trimmed) setResults(null);
            return;
        }
        setLoading(true);
        setFailed(false);
        const request = ++latest.current;
        const timer = setTimeout(async () => {
            try {
                const found = await storefront.search(trimmed, { store: info?.id });
                if (request !== latest.current) return;
                setResults(Array.from(found || []) as any[]);
            } catch {
                if (request === latest.current) setFailed(true);
            } finally {
                if (request === latest.current) setLoading(false);
            }
        }, SEARCH_DELAY_MS);
        return () => clearTimeout(timer);
    }, [info?.id, retry, storefront, trimmed]);

    const remember = useCallback((term: string) => setRecents(addRecentSearch(recents, term)), [recents, setRecents]);

    const openProduct = (resource: any) => {
        remember(trimmed);
        navigation.navigate('Product', {
            product: resource.serialize(),
            productId: resource.id,
            storeLocationId: getSelectedStoreLocation(info?.id)?.id,
        });
    };

    const openCategory = (categoryId: string) => navigation.navigate('StoreHomeTab', { screen: 'StoreHome', params: { categoryId } });

    const firstSearch = loading && results === null;
    const refreshing = loading && results !== null;

    return (
        <YStack flex={1} backgroundColor='$background'>
            <YStack paddingHorizontal={space.gutter} paddingTop={insets.top + 8} paddingBottom={10} gap={10}>
                <UIText variant='title' accessibilityRole='header'>
                    {t('StoreSearch.title')}
                </UIText>
                <XStack height={50} alignItems='center' gap={10} paddingLeft={14} paddingRight={6} borderRadius={radius.button} borderWidth={2} borderColor={trimmed ? '$primary' : '$borderColor'}>
                    <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color={theme.textSecondary.val} />
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={() => trimmed && remember(trimmed)}
                        placeholder={t('StorePage.searchStore', { store: info?.name ?? '' })}
                        placeholderTextColor={theme.textPlaceholder.val}
                        accessibilityLabel={t('StorePage.searchStore', { store: info?.name ?? '' })}
                        returnKeyType='search'
                        autoCorrect={false}
                        style={{ flex: 1, height: '100%', fontSize: 16, color: theme.textPrimary.val, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null) }}
                    />
                    {refreshing && <UIText variant='caption' tone='secondary' accessibilityLiveRegion='polite'>{t('StoreSearch.updating')}</UIText>}
                    {!!query && <IconButton icon={faXmark} size={36} accessibilityLabel={t('StoreSearch.clear')} onPress={() => setQuery('')} />}
                </XStack>
            </YStack>

            {!trimmed ? (
                <FlatList
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    data={recents}
                    keyExtractor={(term) => term}
                    keyboardShouldPersistTaps='handled'
                    contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 24 }}
                    ListHeaderComponent={
                        recents.length > 0 ? (
                            <XStack justifyContent='space-between' alignItems='center'>
                                <UIText variant='subheading'>{t('StoreSearch.recent')}</UIText>
                                <Pressable onPress={() => setRecents([])} accessibilityRole='button' style={{ minHeight: 40, justifyContent: 'center' }}>
                                    <UIText variant='captionStrong' tone='brand'>
                                        {t('StoreSearch.clearRecent')}
                                    </UIText>
                                </Pressable>
                            </XStack>
                        ) : null
                    }
                    renderItem={({ item }) => (
                        <XStack alignItems='center' gap={12} minHeight={48} borderBottomWidth={1} borderColor='$borderColor'>
                            <Pressable onPress={() => setQuery(item)} accessibilityRole='button' style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
                                <FontAwesomeIcon icon={faClockRotateLeft} size={14} color={theme.textSecondary.val} />
                                <UIText>{item}</UIText>
                            </Pressable>
                            <IconButton icon={faXmark} size={36} variant='plain' accessibilityLabel={t('StoreSearch.removeRecent', { term: item })} onPress={() => setRecents(removeRecentSearch(recents, item))} />
                        </XStack>
                    )}
                    ListFooterComponent={
                        categories.length > 0 ? (
                            <YStack gap={10} marginTop={22}>
                                <UIText variant='subheading'>{t('StoreSearch.popular', { store: info?.name ?? '' })}</UIText>
                                <XStack flexWrap='wrap' gap={8}>
                                    {categories.map((category) => (
                                        <Chip key={category.id} label={category.name} appearance='filled' onPress={() => openCategory(category.id)} />
                                    ))}
                                </XStack>
                            </YStack>
                        ) : null
                    }
                />
            ) : firstSearch ? (
                <YStack paddingHorizontal={space.gutter} gap={16} paddingTop={8}>
                    {[0, 1, 2, 3, 4].map((index) => (
                        <XStack key={index} gap={14}>
                            <YStack flex={1} gap={8}>
                                <Skeleton height={14} width='60%' />
                                <Skeleton height={12} width='85%' />
                                <Skeleton height={14} width='25%' />
                            </YStack>
                            <Skeleton width={96} height={96} radius={radius.tile} />
                        </XStack>
                    ))}
                </YStack>
            ) : failed ? (
                <ErrorState description={t('StoreSearch.error')} onRetry={() => setRetry((value) => value + 1)} />
            ) : (
                <FlatList
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    data={results ?? []}
                    keyExtractor={(item: any) => item.id}
                    keyboardShouldPersistTaps='handled'
                    keyboardDismissMode='on-drag'
                    style={{ opacity: refreshing ? 0.6 : 1 }}
                    contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 24, flexGrow: 1 }}
                    ListHeaderComponent={
                        results && results.length > 0 ? (
                            <UIText variant='caption' tone='secondary' style={{ paddingBottom: 4 }}>
                                {t('StoreSearch.resultCount', { count: results.length, query: trimmed })}
                            </UIText>
                        ) : null
                    }
                    renderItem={({ item }) => <ProductRow product={productSummary(item)} onPress={() => openProduct(item)} />}
                    ListEmptyComponent={
                        <EmptyState
                            icon={faMagnifyingGlass}
                            title={t('StoreSearch.noResultsTitle', { query: trimmed })}
                            description={t('StoreSearch.noResultsBody')}
                            actionLabel={categories.length ? t('StoreSearch.browseCategories') : undefined}
                            onAction={categories.length ? () => navigation.navigate('StoreHomeTab', { screen: 'StoreCatalog' }) : undefined}
                        />
                    }
                />
            )}
        </YStack>
    );
};

export default StoreSearchScreen;
