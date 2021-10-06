import Storefront from '@fleetbase/storefront';
import config from 'config';

const { STOREFRONT_KEY, FLEETBASE_HOST } = config;
let storefront, adapter;

try {
    storefront = new Storefront(STOREFRONT_KEY, { host: FLEETBASE_HOST });
    adapter = storefront.getAdapter();
} catch (error) {
    storefront = error;
}

const useStorefront = () => {
    return storefront;
};

export default useStorefront;
export { adapter };
