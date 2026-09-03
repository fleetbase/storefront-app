import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { Button, Image, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';
import useStorefront from '../hooks/use-storefront';
import { getCoordinates, getCurrentLocationFromStorage } from '../utils/location';
import MarketplaceStoreCard from '../components/MarketplaceStoreCard';
import { buildMarketplaceStoreQuery, mergeMarketplacePage } from '../utils/marketplace-runtime';

const PAGE_SIZE = 20;
const SORTS = ['nearest', 'highest_rated', 'lowest_rated', 'popular', 'trending', 'newest', 'oldest'];

const MarketplaceDiscoverScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const { storefront } = useStorefront();
    const { network, ownerInfo, discovery, updateDiscovery, clearDiscovery } = useStorefrontRuntime();
    const [stores, setStores] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const requestSequence = useRef(0);
    const storeCount = useRef(0);

    const buildParams = useCallback(
        (offset = 0) => {
            const currentLocation = getCurrentLocationFromStorage();
            return buildMarketplaceStoreQuery(discovery, offset, currentLocation ? getCoordinates(currentLocation) : null);
        },
        [discovery]
    );

    const loadStores = useCallback(
        async ({ append = false, refresh = false } = {}) => {
            if (!network) return;
            const sequence = ++requestSequence.current;
            const offset = append ? storeCount.current : 0;
            append ? setLoadingMore(true) : refresh ? setRefreshing(true) : setLoading(true);
            setError(null);
            try {
                const result = await network.getStores(buildParams(offset));
                if (sequence !== requestSequence.current) return;
                const next = Array.from(result || []);
                setStores((current) => {
                    const updated = mergeMarketplacePage(current, next, append);
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
        [buildParams, network]
    );

    useEffect(() => {
        loadStores();
        return () => {
            requestSequence.current += 1;
        };
    }, [loadStores]);

    useEffect(() => {
        if (!network || !storefront) return;
        let active = true;
        Promise.all([storefront.categories.query({ parents_only: true }), network.getTags()])
            .then(([categoryResult, tagResult]) => {
                if (!active) return;
                setCategories(Array.from(categoryResult || []));
                setTags(Array.from(tagResult || []));
            })
            .catch(() => {
                // Discovery remains useful even if optional filter metadata fails.
            });
        return () => {
            active = false;
        };
    }, [network, storefront]);

    const activeFilterCount = Number(!!discovery.category) + discovery.tags.length + Number(discovery.online !== null);
    const header = useMemo(
        () => (
            <YStack>
                <Image source={{ uri: ownerInfo?.backdrop_url }} width='100%' height={170} resizeMode='cover' />
                <YStack p='$4' gap='$2'>
                    <XStack alignItems='center' gap='$3'>
                        <Image source={{ uri: ownerInfo?.logo_url }} width={64} height={64} borderRadius='$3' />
                        <YStack flex={1}>
                            <Text color='$textPrimary' fontWeight='800' fontSize='$8'>
                                {ownerInfo?.name}
                            </Text>
                            {!!ownerInfo?.description && <Paragraph color='$textSecondary'>{ownerInfo.description}</Paragraph>}
                        </YStack>
                    </XStack>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sorts}>
                        {SORTS.map((sort) => (
                            <Button key={sort} size='$3' bg={discovery.sort === sort ? '$primary' : '$surface'} color={discovery.sort === sort ? '$primaryText' : '$textPrimary'} onPress={() => updateDiscovery({ sort })}>
                                {t(`Marketplace.sort.${sort}`)}
                            </Button>
                        ))}
                    </ScrollView>
                    {!!categories.length && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                            <Button size='$3' bg={!discovery.category ? '$primary' : '$surface'} onPress={() => updateDiscovery({ category: null })}>
                                {t('Marketplace.allCategories')}
                            </Button>
                            {categories.map((category: any) => (
                                <Button key={category.id} size='$3' bg={discovery.category === category.id ? '$primary' : '$surface'} onPress={() => updateDiscovery({ category: category.id })}>
                                    {category.getAttribute('name')}
                                </Button>
                            ))}
                            <Button size='$3' bg={discovery.category === 'uncategorized' ? '$primary' : '$surface'} onPress={() => navigation.navigate('MarketplaceCategory', { category: null, categoryId: 'uncategorized' })}>
                                {t('Marketplace.uncategorized')}
                            </Button>
                        </ScrollView>
                    )}
                    {!!tags.length && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                            {tags.map((tag) => {
                                const selected = discovery.tags.includes(tag);
                                return (
                                    <Button key={tag} size='$2' bg={selected ? '$secondary' : '$background'} onPress={() => updateDiscovery({ tags: selected ? discovery.tags.filter((item) => item !== tag) : [...discovery.tags, tag] })}>
                                        {tag}
                                    </Button>
                                );
                            })}
                        </ScrollView>
                    )}
                    <XStack gap='$2'>
                        <Button size='$3' bg={discovery.online === true ? '$primary' : '$surface'} onPress={() => updateDiscovery({ online: discovery.online === true ? null : true })}>
                            {t('Marketplace.openNow')}
                        </Button>
                        {activeFilterCount > 0 && (
                            <Button size='$3' chromeless onPress={clearDiscovery}>
                                {t('Marketplace.clearFilters', { count: activeFilterCount })}
                            </Button>
                        )}
                    </XStack>
                    <Text color='$textPrimary' fontSize='$7' fontWeight='700' mt='$2'>
                        {t('Marketplace.stores')}
                    </Text>
                </YStack>
            </YStack>
        ),
        [activeFilterCount, categories, clearDiscovery, discovery, navigation, ownerInfo, t, tags, updateDiscovery]
    );

    return (
        <YStack flex={1} bg='$background' pt={insets.top}>
            <FlatList
                data={stores}
                keyExtractor={(item: any) => item.id}
                renderItem={({ item }) => <MarketplaceStoreCard store={item} onPress={(store: any) => navigation.navigate('MarketplaceStore', { store: store.serialize(), storeId: store.id })} />}
                ListHeaderComponent={header}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStores({ refresh: true })} />}
                onEndReached={() => hasMore && !loadingMore && loadStores({ append: true })}
                onEndReachedThreshold={0.4}
                ListFooterComponent={loadingMore ? <Spinner my='$4' /> : null}
                ListEmptyComponent={
                    loading ? (
                        <YStack p='$8' alignItems='center'><Spinner size='large' /></YStack>
                    ) : error ? (
                        <YStack p='$6' alignItems='center' gap='$3'><Text color='$textSecondary' textAlign='center'>{t('Marketplace.loadError')}</Text><Button onPress={() => loadStores()}>{t('common.retry')}</Button></YStack>
                    ) : (
                        <YStack p='$6' alignItems='center' gap='$2'><Text color='$textPrimary' fontSize='$6'>{t('Marketplace.noStores')}</Text><Paragraph color='$textSecondary' textAlign='center'>{t('Marketplace.noStoresDescription')}</Paragraph></YStack>
                    )
                }
            />
        </YStack>
    );
};

export default MarketplaceDiscoverScreen;

const styles = StyleSheet.create({
    sorts: { gap: 8, paddingVertical: 8 },
    filters: { gap: 8, paddingBottom: 8 },
    list: { paddingBottom: 100, paddingHorizontal: 12 },
});
