import Storefront from '@fleetbase/storefront';
import Config from 'react-native-config';

const { STOREFRONT_KEY, FLEETBASE_HOST } = Config;
let storefront, adapter;

try {
    storefront = new Storefront(STOREFRONT_KEY, { host: FLEETBASE_HOST });
} catch (error) {
    storefront = error;
}

if (storefront instanceof Storefront) {
    adapter = storefront.getAdapter();
}

const useStorefrontSdk = () => {
    return storefront;
};

export default useStorefrontSdk;

export { adapter };
