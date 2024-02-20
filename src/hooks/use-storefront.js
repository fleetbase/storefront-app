import Storefront from '@fleetbase/storefront';
import config from 'config';

const { STOREFRONT_KEY, FLEETBASE_HOST } = config;
let storefront, adapter;

try {
    storefront = new Storefront('network_f7c72f15ff4be9fd3f6fa25ed30271af', { host: FLEETBASE_HOST });
    adapter = storefront.getAdapter();
} catch (error) {
    storefront = error;
}

const useStorefront = () => {
    return storefront;
};

export default useStorefront;
export { adapter };
