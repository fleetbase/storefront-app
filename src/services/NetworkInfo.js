import { Network } from '@fleetbase/storefront';
import { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { useStoreLocation } from 'hooks';
import { get } from 'utils/Storage';

const info = get('info');

/**
 * Wrapper for storefront calls from the current Store instance.
 *
 * @export
 * @class NetworkInfoService
 */
export default class NetworkInfoService {
    /**
     * Returns an instance of the current Store.
     *
     * @static
     * @return {Network}
     * @memberof NetworkInfoService
     */
    static instance() {
        return new Network(info, StorefrontAdapter);
    }

    /**
     * Fetches the current networks stores
     *
     * @static
     * @return {Promise}
     * @memberof NetworkInfoService
     */
    static getStores(params = {}) {
        const network = NetworkInfoService.instance();

        return network.getStores(params);
    }
}
