import { useEffect, useState } from 'react';
import { Collection } from '@fleetbase/sdk';
import { lookup } from '@fleetbase/storefront';
import useStorefront from './use-storefront';
import useStorage from './use-storage';
import { isObject, isArray, isResource } from '../utils';

export const restoreStorefrontResource = (data) => {
    // If array of resources
    if (isArray(data) && data.length) {
        const isCollectionData = data.every((resource) => resource && isObject(resource.attributes));
        const resourceType = data[0].resource;

        if (isCollectionData) {
            const collectionData = data.map(({ attributes, resource: type }) => lookup('resource', type, attributes));
            return new Collection(collectionData);
        }
    }

    // If single resource
    if (isResource(data)) {
        return lookup('resource', data.resource, data.attributes);
    }

    return data;
};

const useStorefrontData = (sdkMethod, onDataLoaded, options = {}) => {
    const { persistKey, defaultValue = null, dependencies = [] } = isObject(onDataLoaded) ? onDataLoaded : options;
    const { storefront } = useStorefront();

    // Use either useState or useStorage depending on whether persistKey is provided
    const [data, setData] = persistKey ? useStorage(persistKey, defaultValue) : useState(defaultValue);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!storefront || typeof sdkMethod !== 'function') return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const result = await sdkMethod(storefront);
                setData(result);
                if (typeof onDataLoaded === 'function') {
                    onDataLoaded(result);
                }
            } catch (err) {
                setError(err);
                console.error('Error loading storefront data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [storefront, ...dependencies]); // Watch dependencies

    return { data: persistKey ? restoreStorefrontResource(data) : data, error, loading };
};

export default useStorefrontData;
