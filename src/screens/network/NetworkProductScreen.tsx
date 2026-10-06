import React, { useEffect, useMemo, useState } from 'react';
import { Product, Store } from '@fleetbase/storefront';
import { YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import useStorefront from '../../hooks/use-storefront';
import { useLanguage } from '../../contexts/LanguageContext';
import { serializeSdkResource } from '../../network/network-runtime';
import { Button, ErrorState, Skeleton, space } from '../../ui';
import NetworkProductDetail from './NetworkProductDetail';

const NetworkProductScreen = ({ route }: any) => {
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

    if (error || (!resolvedParams && (!productId || !storeId))) {
        return (
            <YStack flex={1} justifyContent='center' backgroundColor='$background'>
                <ErrorState title={t('Network.productUnavailable')} />
                <YStack alignItems='center'>
                    <Button variant='outline' onPress={() => navigation.goBack()}>
                        {t('common.goBack')}
                    </Button>
                </YStack>
            </YStack>
        );
    }

    if (!resolvedParams) {
        return (
            <YStack flex={1} backgroundColor='$background' gap={12}>
                <Skeleton height={280} radius={0} />
                <YStack paddingHorizontal={space.gutter} gap={12}>
                    <Skeleton height={24} width='70%' />
                    <Skeleton height={18} width='30%' />
                    <Skeleton height={14} width='90%' />
                </YStack>
            </YStack>
        );
    }

    return <NetworkProductDetail params={resolvedParams} />;
};

export default NetworkProductScreen;
