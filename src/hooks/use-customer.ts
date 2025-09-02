import { useEffect, useState, useCallback } from 'react';
import { EventRegister } from 'react-native-event-listeners';
import { Customer } from '@fleetbase/storefront';
import useStorage, { clear, storage } from './use-storage';
import useStorefront, { adapter } from './use-storefront';

const { emit } = EventRegister;

export function isValidCustomer(target) {
    return isResource(target, 'customer');
}

const useCustomer = () => {
    const { storefront } = useStorefront();
    const [storedCustomer, setStoredCustomer] = useStorage('customer');
    const [customer, setCustomerState] = useState(() => {
        return storedCustomer ? new Customer(storedCustomer, adapter) : null;
    });

    // Sync customer with storedCustomer on mount
    useEffect(() => {
        if (storedCustomer) {
            setCustomerState(new Customer(storedCustomer, adapter));
        }
    }, [storedCustomer, storefront]);

    // Update the customer and persist changes
    const setCustomer = useCallback(
        (newCustomer) => {
            if (!newCustomer) {
                setStoredCustomer(null);
                setCustomerState(null);
                emit('customer.updated', null);
                return;
            }

            const customerInstance = newCustomer instanceof Customer ? newCustomer : new Customer(newCustomer, adapter);

            // Restore customer token if needed
            if (!customerInstance.token && storage.getString('_customer_token')) {
                customerInstance.setAttribute('token', storage.getString('_customer_token'));
            }

            setStoredCustomer(customerInstance.serialize());
            setCustomerState(customerInstance);
            emit('customer.updated', customerInstance);
        },
        [storefront, setStoredCustomer]
    );

    // Update customer default location
    const updateCustomerLocation = async (location) => {
        try {
            const customer = await customer.update({ place: location.id });
            setCustomer(customer);
        } catch (err) {
            throw err;
        }
    };

    // Update customer default location
    const updateCustomerMeta = async (newMeta = {}) => {
        const meta = { ...customer.getAttribute('meta'), ...newMeta };
        try {
            const customer = await customer.update({ meta });
            setCustomer(customer);
        } catch (err) {
            throw err;
        }
    };

    // Sync mobile device with the customer on the server
    const syncDevice = useCallback(() => {
        const token = get('token');
        if (isValidCustomer(customer) && token) {
            customer.syncDevice(token).catch((error) => {
                console.error('[Error syncing customer device]', error);
            });
        }
    }, [customer]);

    // Sign out the customer (clear session)
    const signOut = useCallback(() => {
        setStoredCustomer(null);
        setCustomerState(null);
        emit('customer.signedOut');
    }, [setStoredCustomer]);

    return { customer, setCustomer, syncDevice, updateCustomerLocation, signOut };
};

export default useCustomer;
