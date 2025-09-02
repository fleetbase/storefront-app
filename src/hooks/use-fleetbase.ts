import { useMemo, useState, useEffect } from 'react';
import Fleetbase from '@fleetbase/sdk';
import Config from 'react-native-config';
import { getString } from './use-storage';

const { FLEETBASE_KEY, FLEETBASE_HOST } = Config;
export let instance = new Fleetbase(FLEETBASE_KEY, { host: FLEETBASE_HOST });
export let adapter = instance.getAdapter();

const useFleetbase = () => {
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
        if (authToken) {
            const authorizedAdapter = adapter.setHeaders({ 'Customer-Token': authToken });
            instance.setAdapter(authorizedAdapter);
        }

        try {
            setFleetbase(instance);
        } catch (initializationError) {
            setError(initializationError);
        }
    }, []);

    return { fleetbase, adapter: fleetbaseAdapter, error };
};

export default useFleetbase;
