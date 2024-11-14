import { Store } from '@fleetbase/storefront';
import { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { useStoreLocation } from 'hooks';
import { get } from 'utils/Storage';

const info = get('info');

/**
 * Wrapper for storefront calls from the current Store instance.
 *
 * @export
 * @class StoreInfoService
 */
export default class StoreInfoService {
    /**
     * Returns an instance of the current Store.
     *
     * @static
     * @return {*}
     * @memberof StoreInfoService
     */
    static instance() {
        return new Store(info, StorefrontAdapter);
    }

    /**
     * Fetches the current store locations then sets the first as the default.
     *
     * @static
     * @return {Promise}
     * @memberof StoreInfoService
     */
    static getDefaultLocation() {
        const store = StoreInfoService.instance();

        return new Promise((resolve, reject) => {
            store
                .getLocations()
                .then((locations) => {
                    const defaultStoreLocation = locations.first;

                    if (defaultStoreLocation) {
                        resolve({
                            locations: locations,
                            defaultStoreLocation: defaultStoreLocation,
                        });
                    } else {
                        reject(new Error('Store has no locations defined!'));
                    }
                })
                .catch(reject);
        });
    }
}
