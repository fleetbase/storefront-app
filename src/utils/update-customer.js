import { EventRegister } from 'react-native-event-listeners';
import { set } from './storage';

const updateCustomer = (customer) => {
    set('customer', customer.serialize());
    EventRegister.emit('customer.updated', customer);
};

export default updateCustomer;