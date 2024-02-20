import Storefront from '@fleetbase/storefront';
import config from 'config';

import { get } from 'utils/Storage';

let { STOREFRONT_KEY, FLEETBASE_HOST } = config;

const useStorefront = () => {
    const storefront = new Storefront(STOREFRONT_KEY || 'store_726cc5fe346591e99edfa2aed2102148', { host: 'https://460a-202-131-229-106.ngrok-free.app' });
    const adapter = storefront.getAdapter();

    return storefront;
};

export default useStorefront;
