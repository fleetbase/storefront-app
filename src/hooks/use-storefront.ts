import { useMemo, useState, useEffect } from 'react';
import Storefront from '@fleetbase/storefront';
import Config from 'react-native-config';
import { getString } from './use-storage';
import { useLanguage } from '../contexts/LanguageContext';
import { withHeaders } from '../commerce/http';

const { STOREFRONT_KEY, FLEETBASE_HOST } = Config;
export const instance = new Storefront(STOREFRONT_KEY, { host: FLEETBASE_HOST });
export const adapter = instance.getAdapter();

const hasStorefrontConfig = () => {
    return 'FLEETBASE_KEY' in Config && 'STOREFRONT_KEY' in Config;
};

const useStorefront = () => {
    const { locale } = useLanguage();
    const [storefront, setStorefront] = useState<Storefront | null>(null);
    const [storefrontAdapter, setStorefrontAdapter] = useState(adapter);
    const [error, setError] = useState<Error | null>(null);
    const authToken = getString('_customer_token');

    useEffect(() => {
        // Build headers object with locale and auth
        const headers: Record<string, string> = {
            'Accept-Language': locale || 'en',
        };

        if (authToken) {
            headers['Customer-Token'] = authToken;
        }

        const configuredAdapter = withHeaders(adapter, headers);
        instance.setAdapter(configuredAdapter);
        // Storefront 2 rebuilds its stores with the new adapter in setAdapter().

        try {
            setStorefrontAdapter(configuredAdapter);
            setStorefront(instance);
        } catch (initializationError) {
            setError(initializationError);
        }
    }, [authToken, locale]);

    return useMemo(
        () => ({
            storefront,
            adapter: storefrontAdapter,
            error,
            hasStorefrontConfig,
        }),
        [storefront, storefrontAdapter, error]
    );
};

export default useStorefront;
