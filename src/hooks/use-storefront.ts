import { useMemo, useState, useEffect } from 'react';
import Storefront from '@fleetbase/storefront';
import Config from 'react-native-config';
import { getString } from './use-storage';
import { useLanguage } from '../contexts/LanguageContext';

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
        
        const configuredAdapter = adapter.setHeaders(headers);
        instance.setAdapter(configuredAdapter);
        // Compatibility for Storefront JS <=1.1.14. Newer SDK versions rebuild
        // these stores in setAdapter(), but current released clients require the
        // adapter to be propagated explicitly after locale/auth header changes.
        for (const storeName of ['products', 'categories', 'foodTrucks', 'reviews', 'customers', 'cart', 'checkout']) {
            if (instance[storeName]) instance[storeName].adapter = configuredAdapter;
        }

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
