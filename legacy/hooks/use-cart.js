import { EventRegister } from 'react-native-event-listeners';
import { Cart } from '@fleetbase/storefront';
import { get, set, storage, useMMKVStorage } from 'utils/Storage';
import useStorefront from './use-storefront';

const { emit } = EventRegister;

const useCart = () => {
    const [value, setValue] = useMMKVStorage('cart', storage);
    const storefront = useStorefront();

    const setCart = (cart) => {
        if (typeof cart?.serialize === 'function') {
            emit('cart.updated', cart);

            return setValue(cart.serialize());
        }

        setValue(cart);
    };

    if (value) {
        return [new Cart(value, storefront.getAdapter()), setCart];
    }

    return [value, setCart];
};

export default useCart;
