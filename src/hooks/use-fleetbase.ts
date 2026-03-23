import { useMemo, useState, useEffect } from 'react';
import Fleetbase from '@fleetbase/sdk';
import Config from 'react-native-config';
import { getString } from './use-storage';
import { useLanguage } from '../contexts/LanguageContext';

const { FLEETBASE_KEY, FLEETBASE_HOST } = Config;
export let instance = new Fleetbase(FLEETBASE_KEY, { host: FLEETBASE_HOST });
export let adapter = instance.getAdapter();

const useFleetbase = () => {
    const { locale } = useLanguage();
    const [fleetbase, setFleetbase] = useState<Fleetbase | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const fleetbaseAdapter = useMemo(() => {
        if (fleetbase) {
            return fleetbase.getAdapter();
        }

        return adapter;
    }, [fleetbase]);

    useEffect(() => {
        const authToken = getString('_customer_token');
        
        // Build headers object with locale and auth
        const headers: Record<string, string> = {
            'Accept-Language': locale || 'en',
        };
        
        if (authToken) {
            headers['Customer-Token'] = authToken;
        }
        
        const configuredAdapter = adapter.setHeaders(headers);
        instance.setAdapter(configuredAdapter);

        try {
            setFleetbase(instance);
        } catch (initializationError) {
            setError(initializationError);
        }
    }, [locale]);

    return { fleetbase, adapter: fleetbaseAdapter, error };
};

export default useFleetbase;
