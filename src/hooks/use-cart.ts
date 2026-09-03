import { useCartContext } from '../contexts/CartContext';

const useCart = () => {
    const { cart, updateCart, isLoading, addProduct } = useCartContext();
    return [cart, updateCart, isLoading, addProduct] as const;
};

export default useCart;
