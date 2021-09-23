import { EventRegister } from 'react-native-event-listeners';
import { Customer } from '@fleetbase/storefront';
import storage, { get, set, useMMKVStorage } from './storage';
import { adapter } from './use-storefront-sdk';

const { emit } = EventRegister;

const getCustomer = () => {
    const attributes = get('customer');

    if (!attributes) {
        return null;
    }

    return new Customer(attributes, adapter);
};

const updateCustomer = (customer) => {
     if (typeof customer?.serialize === 'function') {
        set('customer', customer.serialize());
        emit('customer.updated', customer);
    }
};

const useCustomer = () => {
    const [value, setValue] = useMMKVStorage('customer', storage);

    const setCustomer = (customer) => {
        if (typeof customer?.serialize === 'function') {
            setValue(customer.serialize());
            return;
        }

        setValue(customer);
    }

    if (value) {
        return [new Customer(value, adapter), setCustomer];
    }

    return [value, setCustomer];
};

export { updateCustomer, getCustomer, useCustomer };
