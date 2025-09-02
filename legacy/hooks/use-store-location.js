import { EventRegister } from 'react-native-event-listeners';
import { StoreLocation } from '@fleetbase/storefront';
import { get, set, storage, useMMKVStorage } from 'utils/Storage';
import useStorefront from './use-storefront';

const { emit } = EventRegister;

const useStoreLocation = () => {
    const [value, setValue] = useMMKVStorage('store_location', storage);
    const storefront = useStorefront();

    const setStoreLocation = (location) => {
        if (typeof location?.serialize === 'function') {
            emit('store_location.updated', location);
            emit('store_location.changed', location);

            return setValue(location.serialize());
        }

        setValue(location);
    };

    if (value) {
        return [new StoreLocation(value, storefront.getAdapter()), setStoreLocation];
    }

    return [value, setStoreLocation];
};

export default useStoreLocation;
