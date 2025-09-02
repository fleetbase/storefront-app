import CartScreen from '../../screens/CartScreen';
import CartItemScreen from '../../screens/CartItemScreen';

export const Cart = {
    screen: CartScreen,
    options: {
        headerShown: false,
    },
};

export const CartModal = {
    screen: CartScreen,
    options: {
        presentation: 'modal',
        headerShown: false,
    },
};

export const CartItem = {
    screen: CartItemScreen,
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
