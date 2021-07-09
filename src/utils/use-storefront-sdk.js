import Storefront from '@fleetbase/storefront';
import Config from 'react-native-config';

const { STOREFRONT_KEY } = Config;

const storefront = new Storefront(STOREFRONT_KEY, { host: 'https://v2api.fleetbase.engineering' });
const adapter = storefront.getAdapter();

const useStorefrontSdk = () => {
    return storefront;
};

export default useStorefrontSdk;

export { adapter };
