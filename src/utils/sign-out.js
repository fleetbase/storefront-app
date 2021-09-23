import { set } from './storage';
import getCurrentLocation from './location';

const signOut = () => {
    set('customer', null);
    set('location', null);

    getCurrentLocation();
};

export default signOut;