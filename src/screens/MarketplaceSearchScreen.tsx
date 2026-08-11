import React, { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Product, Store } from '@fleetbase/storefront';
import { Button, Image, Input, Spinner, Text, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';
import useStorefront from '../hooks/use-storefront';
import { serializeSdkResource } from '../utils/marketplace-runtime';
import { formatCurrency } from '../utils/format';

const MarketplaceSearchScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const { storefront } = useStorefront();
    const { network, enterStore, getSelectedStoreLocation } = useStorefrontRuntime();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [retryCounter, setRetryCounter] = useState(0);
    const requestId = useRef(0);

    useEffect(() => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery || !storefront || !network) {
            requestId.current += 1;
            setResults([]);
            setLoading(false);
            setError(null);
            return;
        }
        const timeout = setTimeout(async () => {
            const activeRequest = ++requestId.current;
            setLoading(true);
            setError(null);
            try {
                const [productResponse, storeResponse] = await Promise.all([
                    storefront.search(trimmedQuery, { with_store: true, limit: 30 }),
                    network.getStores({ query: trimmedQuery, limit: 20, online: true }),
                ]);
                if (activeRequest !== requestId.current) return;
                // Rehydrate explicitly for compatibility with Storefront JS <=1.1.14,
                // whose search results did not retain the active adapter.
                const products = Array.from(productResponse || []).map((product: any) => ({
                    kind: 'product',
                    resource: new Product(serializeSdkResource(product), storefront.getAdapter()),
                }));
                const stores = Array.from(storeResponse || []).map((store: any) => ({
                    kind: 'store',
                    resource: store instanceof Store ? store : new Store(serializeSdkResource(store), storefront.getAdapter()),
                }));
                setResults([...stores, ...products]);
            } catch (searchError: any) {
                if (activeRequest === requestId.current) setError(searchError);
            } finally {
                if (activeRequest === requestId.current) setLoading(false);
            }
        }, 350);
        return () => clearTimeout(timeout);
    }, [network, query, retryCounter, storefront]);

    const openProduct = (product: any) => {
        const merchantData = product.getAttribute('store');
        if (!merchantData) return;
        const merchant = new Store(merchantData, storefront?.getAdapter());
        enterStore(merchant);
        const storeLocation = getSelectedStoreLocation(merchant.id);
        navigation.navigate('Product', {
            product: product.serialize(),
            productId: product.id,
            store: merchant.serialize(),
            storeId: merchant.id,
            storeLocationId: storeLocation?.id,
        });
    };

    const openStore = (store: any) => {
        enterStore(store);
        navigation.navigate('MarketplaceStore', { store: store.serialize(), storeId: store.id });
    };

    return (
        <YStack flex={1} bg='$background' pt={insets.top}>
            <YStack p='$3' borderBottomWidth={1} borderColor='$borderColor'>
                <Input value={query} onChangeText={setQuery} placeholder={t('Marketplace.searchPlaceholder')} accessibilityLabel={t('Marketplace.searchPlaceholder')} autoCapitalize='none' autoCorrect={false} />
            </YStack>
            {loading && <Spinner my='$4' />}
            <FlatList
                data={results}
                keyExtractor={(item: any) => `${item.kind}-${item.resource.id}`}
                keyboardShouldPersistTaps='handled'
                contentContainerStyle={styles.list}
                renderItem={({ item }) => {
                    const resource = item.resource;
                    const isStore = item.kind === 'store';
                    const merchant = isStore ? {} : resource.getAttribute('store') || {};
                    return (
                        <Button unstyled onPress={() => (isStore ? openStore(resource) : openProduct(resource))} accessibilityRole='button'>
                            <XStack bg='$surface' borderWidth={1} borderColor='$borderColor' borderRadius='$4' p='$3' mb='$3' gap='$3' alignItems='center'>
                                <Image source={{ uri: resource.getAttribute(isStore ? 'logo_url' : 'primary_image_url') || resource.getAttribute('images.0') }} width={76} height={76} borderRadius='$3' />
                                <YStack flex={1} gap='$1'>
                                    <Text color='$textPrimary' fontSize='$6' fontWeight='700'>{resource.getAttribute('name')}</Text>
                                    <Text color='$textSecondary'>{isStore ? t('Marketplace.merchantResult') : merchant.name || t('Marketplace.unknownStore')}</Text>
                                    {!isStore && <Text color='$green10' fontWeight='700'>{formatCurrency(resource.getAttribute('price'), resource.getAttribute('currency'))}</Text>}
                                </YStack>
                            </XStack>
                        </Button>
                    );
                }}
                ListEmptyComponent={!loading ? <YStack p='$8' alignItems='center' gap='$2'><Text color='$textPrimary' fontSize='$6'>{error ? t('Marketplace.searchError') : query.trim() ? t('Marketplace.noSearchResults') : t('Marketplace.searchPrompt')}</Text>{error && <Button onPress={() => setRetryCounter((value) => value + 1)}>{t('common.retry')}</Button>}</YStack> : null}
            />
        </YStack>
    );
};

export default MarketplaceSearchScreen;

const styles = StyleSheet.create({
    list: { padding: 12, paddingBottom: 100 },
});
