import { Customer } from '@fleetbase/storefront';
import { get } from './storage';
import { adapter } from './use-storefront-sdk';

const getCustomer = () => {
    const attributes = get('customer');

    if (!attributes) {
        return null;
    }

    return new Customer(attributes, adapter);
}

export default getCustomer;