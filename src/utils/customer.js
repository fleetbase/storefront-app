import { EventRegister } from 'react-native-event-listeners';
import { Customer } from '@fleetbase/storefront';
import { get, set, storage, useMMKVStorage } from './Storage';
import { endSession, isResource, isVoid } from './Helper';
import useStorefront from 'hooks/use-storefront';

const { emit } = EventRegister;

/**
 * Customer utility class for performing actions on current customer.
 *
 * @export
 * @class Customer
 */
export default class CustomerUtil {
    /**
     * Returns the current customer if authenticated, if no customer
     * then will return null.
     *
     * @static
     * @return {null|Customer}
     * @memberof CustomerUtil
     */
    static get() {
        const attributes = get('customer');
        const storefront = useStorefront();

        if (!attributes) {
            return null;
        }

        return new Customer(attributes, storefront.getAdapter());
    }

    /**
     * Update the current customer resource.
     *
     * @static
     * @param {Customer}
     * @memberof CustomerUtil
     */
    static update(customer) {
        if (typeof customer?.serialize === 'function') {
            set('customer', customer.serialize());
            emit('customer.updated', customer);
        }
    }

    /**
     * Hook for retrieving current customer from state.
     *
     * @static
     * @return {Array}
     * @memberof CustomerUtil
     */
    static use() {
        const [value, setValue] = useMMKVStorage('customer', storage);
        const storefront = useStorefront();

        const setCustomer = (customer) => {
            if (typeof customer?.serialize === 'function') {
                emit('customer.updated', customer);
                return setValue(customer.serialize());
            }

            setValue(customer);
        };

        if (value) {
            return [new Customer(value, storefront.getAdapter()), setCustomer];
        }

        return [value, setCustomer];
    }

    /**
     * Ends session for customer, alias of signOut util.
     *
     * @static
     * @return {void}
     * @memberof CustomerUtil
     */
    static signOut() {
        return endSession();
    }

    /**
     * Sync current mobile device to customer on Fleetbase/Storefront.
     *
     * @static
     * @param {Customer} customer
     * @return {void}
     * @memberof CustomerUtil
     */
    static syncDevice(customer) {
        customer = customer ?? CustomerUtil.get();

        const token = get('token');

        if (CustomerUtil.isValid(customer) && token) {
            customer.syncDevice(token).catch((error) => {
                console.log('[ Error syncing customer device! ]', error);
            });
        }
    }

    /**
     * Checks if customer resource is valid.
     *
     * @static
     * @param {Customer} customer
     * @return {boolean} 
     * @memberof CustomerUtil
     */
    static isValid(customer) {
        return isResource(customer, 'customer') && !isVoid(customer.token);
    }
}

const getCustomer = CustomerUtil.get;
const updateCustomer = CustomerUtil.update;
const useCustomer = CustomerUtil.use;
const syncDevice = CustomerUtil.syncDevice;
const signOut = CustomerUtil.signOut;
const isValidCustomer = CustomerUtil.isValid;

export { updateCustomer, getCustomer, useCustomer, syncDevice, signOut, isValidCustomer };
