import { useEffect, useState, useCallback } from 'react';
import { EventRegister } from 'react-native-event-listeners';
import { getUniqueId } from 'react-native-device-info';
import { Cart } from '@fleetbase/storefront';
import useStorage from './use-storage';
import useStorefront, { adapter } from './use-storefront';

const { emit } = EventRegister;

const useCart = (cartId = null) => {
    const { storefront } = useStorefront();
    const [storedCart, setStoredCart] = useStorage('cart');
    const [cart, setCart] = useState(storedCart ? new Cart(storedCart, adapter) : new Cart({ items: [] }), adapter); // Actual Cart instance

    // Initialize the Cart instance when storefront and storedCart are available
    useEffect(() => {
        // If sdk not initialized nothing we can do
        if (!storefront) return;

        // Load the cart from server
        const loadCartFromServer = async () => {
            cartId = cartId ? cartId : await getUniqueId();
            const cartInstance = await storefront.cart.retrieve(cartId);
            setCart(cartInstance);
            setStoredCart(cartInstance.serialize());
        };

        // Load the cart from storage
        const loadCartFromStorage = () => {
            const cartInstance = new Cart(storedCart, adapter);
            setCart(cartInstance);
        };

        if (storedCart) {
            loadCartFromStorage();
        } else {
            loadCartFromServer();
        }
    }, [storefront, storedCart]);

    // Update the cart: sync instance with storage and emit events
    const updateCart = useCallback(
        (newCart) => {
            if (!newCart) {
                // Clear the cart
                setStoredCart(null);
                setCart(null);
                emit('cart.updated', null);
                return;
            }

            // Ensure we always have a Cart instance
            const cartInstance = newCart instanceof Cart ? newCart : new Cart(newCart, adapter);

            // Persist serialized cart and update state
            setStoredCart(cartInstance.serialize());
            setCart(cartInstance);

            emit('cart.updated', cartInstance);
        },
        [storefront, setStoredCart]
    );

    return [cart, updateCart];
};

export default useCart;
