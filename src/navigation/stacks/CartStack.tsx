import { screenSlot } from '../../extensions';

export const Cart = {
    screen: screenSlot('cart'),
    options: {
        headerShown: false,
    },
};

export const CartModal = {
    screen: screenSlot('cart'),
    options: {
        presentation: 'modal',
        headerShown: false,
    },
};

export const CartItem = {
    screen: screenSlot('cart.item'),
    options: {
        presentation: 'modal',
        headerShown: false,
    },
};

const CartStack = {
    Cart,
    CartModal,
    CartItem,
};

export default CartStack;
