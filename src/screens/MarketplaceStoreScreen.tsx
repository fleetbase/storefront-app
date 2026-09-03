import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Button, Spinner, Text, YStack } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';
import useStorefront from '../hooks/use-storefront';
import StoreHomeScreen from './StoreHomeScreen';

const MarketplaceStoreScreen = ({ route }: any) => {
    const { t } = useLanguage();
    const navigation = useNavigation();
    const { storefront } = useStorefront();
    const { enterStore, leaveStore, currentStore } = useStorefrontRuntime();
    const [loading, setLoading] = useState(!route.params?.store);
    const [error, setError] = useState<Error | null>(null);
    const storeData = route.params?.store;
    const storeId = route.params?.storeId || storeData?.id;

    useEffect(() => {
        let active = true;
        const resolveStore = async () => {
            setError(null);
            if (storeData) {
                enterStore(storeData);
                setLoading(false);
                return;
            }
            if (!storefront || !storeId) {
                setError(new Error('Missing store identifier'));
                setLoading(false);
                return;
            }
            try {
                const result = await storefront.lookup(storeId);
                if (active) enterStore(result);
            } catch (lookupError: any) {
                if (active) setError(lookupError);
            } finally {
                if (active) setLoading(false);
            }
        };
        resolveStore();
        return () => {
            active = false;
            leaveStore();
        };
    }, [enterStore, leaveStore, storeData, storeId, storefront]);

    if (loading) return <YStack flex={1} alignItems='center' justifyContent='center'><Spinner size='large' /></YStack>;
    if (error || !currentStore) return <YStack flex={1} p='$6' alignItems='center' justifyContent='center' gap='$3'><Text color='$textPrimary'>{t('Marketplace.storeUnavailable')}</Text><Button onPress={() => navigation.goBack()}>{t('common.goBack')}</Button></YStack>;
    return <StoreHomeScreen route={route} />;
};

export default MarketplaceStoreScreen;
