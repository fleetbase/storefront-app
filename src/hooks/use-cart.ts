import { useCartContext } from '../contexts/CartContext';

const useCart = () => {
    const { cart, updateCart, isLoading } = useCartContext();
    return [cart, updateCart, isLoading] as const;
};

export default useCart;
