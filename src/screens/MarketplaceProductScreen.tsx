import React, { useEffect, useMemo, useState } from 'react';
import { Product, Store } from '@fleetbase/storefront';
import { Button, Spinner, Text, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import ProductScreen from './ProductScreen';
import useStorefront from '../hooks/use-storefront';
import { useLanguage } from '../contexts/LanguageContext';
import { serializeSdkResource } from '../utils/marketplace-runtime';

const MarketplaceProductScreen = ({ route }: any) => {
    const navigation = useNavigation();
    const { t } = useLanguage();
    const { storefront, adapter } = useStorefront();
    const initialParams = useMemo(() => route.params || {}, [route.params]);
    const [resolvedParams, setResolvedParams] = useState<any>(initialParams.product ? initialParams : null);
    const [error, setError] = useState<Error | null>(null);

    const productId = initialParams.productId;
    const storeId = initialParams.storeId;

    useEffect(() => {
        let active = true;
        if (resolvedParams || !storefront || !productId || !storeId) return;

        Promise.all([storefront.products.find(productId), storefront.lookup(storeId)])
            .then(([productResult, storeResult]: any[]) => {
                if (!active) return;
                const product = productResult instanceof Product ? productResult : new Product(serializeSdkResource(productResult), adapter);
                const store = storeResult instanceof Store ? storeResult : new Store(serializeSdkResource(storeResult), adapter);
                setResolvedParams({ ...initialParams, product: product.serialize(), store: store.serialize() });
            })
            .catch((lookupError: any) => active && setError(lookupError));

        return () => {
            active = false;
        };
    }, [adapter, initialParams, productId, resolvedParams, storeId, storefront]);

    const resolvedRoute = useMemo(() => ({ ...route, params: resolvedParams }), [resolvedParams, route]);

    if (error || (!resolvedParams && (!productId || !storeId))) {
        return (
            <YStack flex={1} alignItems='center' justifyContent='center' gap='$3' p='$6'>
                <Text color='$textPrimary'>{t('Marketplace.productUnavailable')}</Text>
                <Button onPress={() => navigation.goBack()}>{t('common.goBack')}</Button>
            </YStack>
        );
    }

    if (!resolvedParams) return <YStack flex={1} alignItems='center' justifyContent='center'><Spinner size='large' /></YStack>;

    return <ProductScreen route={resolvedRoute} />;
};

export default MarketplaceProductScreen;
