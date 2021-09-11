import { clear, set } from './storage';

const signOut = () => {
    set('customer', null);
    clear();
};

export default signOut;