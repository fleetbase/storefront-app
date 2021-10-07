import { getUniqueId } from 'react-native-device-info';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { isResource } from 'utils';

/**
 * Wrapper for storefront calls from the current Store instance.
 *
 * @export
 * @class CartService
 */
export default class CartService {
    /**
     * Returns an instance of an empty cart.
     *
     * @static
     * @return {*}
     * @memberof CartService
     */
    static instance() {
        return new Cart({}, StorefrontAdapter);
    }

    /**
     * Fetches the current cart, and updates in storage.
     *
     * @static
     * @return {Promise}
     * @memberof CartService
     */
    static get() {
        const storefront = useStorefront();

        return storefront.cart.retrieve(getUniqueId());
    }
}
