import { get } from 'utils/Storage';
import { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { useStoreLocation } from 'hooks';

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
    static setDefaultLocation() {
        const store = StoreInfoUtils.instance();
        const [ storeLocation, setStoreLocation ] = useStoreLocation();

        return store
            .getLocations()
            .then((locations) => {
                const defaultStoreLocation = locations.first;

                if (defaultStoreLocation) {
                    setStoreLocation(defaultStoreLocation);
                }
            })
            .catch((error) => {
                console.log('[ Error fetching store locations! ]', error);
            });
    }
}
