import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Button, Spinner, Text, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';
import MarketplaceStoreCard from '../components/MarketplaceStoreCard';
import useStorefront from '../hooks/use-storefront';

const MarketplaceCategoryScreen = ({ route }: any) => {
    const navigation = useNavigation();
    const { t } = useLanguage();
    const { storefront } = useStorefront();
    const { network, discovery } = useStorefrontRuntime();
    const routeCategory = route.params?.category || null;
    const categoryId = route.params?.categoryId;
    const [category, setCategory] = useState(routeCategory);
    const [categoryReady, setCategoryReady] = useState(!!routeCategory || !categoryId || categoryId === 'uncategorized');
    const [categoryError, setCategoryError] = useState<Error | null>(null);
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const requestId = useRef(0);

    const load = useCallback(
        async (refresh = false) => {
            if (!network || !categoryReady) return;
            const currentRequest = ++requestId.current;
            refresh ? setRefreshing(true) : setLoading(true);
            setError(null);
            try {
                const result = await network.getStores({
                    category: category?.id,
                    without_category: !category,
                    sort: discovery.sort,
                    limit: 50,
                });
                if (requestId.current === currentRequest) setStores(Array.from(result || []));
            } catch (loadError: any) {
                if (requestId.current === currentRequest) setError(loadError);
            } finally {
                if (requestId.current === currentRequest) {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        },
        [category, categoryReady, discovery.sort, network]
    );

    useEffect(() => {
        let active = true;
        if (categoryReady || !storefront || !categoryId) return;
        storefront.categories
            .query({ parents_only: true })
            .then((result: any) => {
                if (!active) return;
                const match = Array.from(result || []).find((item: any) => item.id === categoryId);
                if (!match) throw new Error('Marketplace category not found');
                setCategory(match);
                setCategoryReady(true);
            })
            .catch((resolveError: any) => active && setCategoryError(resolveError));
        return () => {
            active = false;
        };
    }, [categoryId, categoryReady, storefront]);

    useEffect(() => {
        load();
        return () => {
            requestId.current += 1;
        };
    }, [load]);

    return (
        <YStack flex={1} bg='$background'>
            <FlatList
                data={stores}
                keyExtractor={(item: any) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
                renderItem={({ item }) => <MarketplaceStoreCard store={item} onPress={(store: any) => navigation.navigate('MarketplaceStore', { store: store.serialize(), storeId: store.id })} />}
                ListEmptyComponent={
                    loading ? <Spinner m='$8' /> : error || categoryError ? <YStack p='$6' gap='$3' alignItems='center'><Text>{t('Marketplace.loadError')}</Text><Button onPress={() => load()}>{t('common.retry')}</Button></YStack> : <Text p='$6' textAlign='center' color='$textSecondary'>{t('Marketplace.noCategoryStores')}</Text>
                }
            />
        </YStack>
    );
};

export default MarketplaceCategoryScreen;

const styles = StyleSheet.create({
    list: { padding: 12, paddingBottom: 100 },
});
