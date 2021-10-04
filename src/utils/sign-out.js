import { set } from './storage';
import { Collection } from '@fleetbase/sdk';
import { EventRegister } from 'react-native-event-listeners';
import getCurrentLocation from './location';

const { emit } = EventRegister;

const signOut = () => {
    set('customer', null);
    set('location', null);
    set('places', new Collection());

    emit('customer.signedout', true);

    getCurrentLocation();
};

export default signOut;