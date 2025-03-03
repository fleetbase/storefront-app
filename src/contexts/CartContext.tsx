import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { EventRegister } from 'react-native-event-listeners';
import { getUniqueId } from 'react-native-device-info';
import { Cart } from '@fleetbase/storefront';
import useStorage, { getString } from '../hooks/use-storage';
import useStorefront, { adapter } from '../hooks/use-storefront';

const { emit } = EventRegister;

type CartContextType = {
    cart: Cart | null;
    updateCart: (newCart: Cart | null) => void;
    isLoading: boolean;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const { storefront } = useStorefront();
    const [storedCart, setStoredCart] = useStorage('cart');
    const [cart, setCart] = useState<Cart | null>(storedCart ? new Cart(storedCart, adapter) : new Cart({ items: [] }, adapter));
    const [isLoading, setIsLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Initialize the Cart instance when storefront and storedCart are available
    useEffect(() => {
        if (!storefront) {
            return;
        }

        const cartChanged = (newCart) => {
            return JSON.stringify(newCart) !== JSON.stringify(storedCart);
        };

        const loadCartFromServer = async () => {
            try {
                const cartId = await getUniqueId();
                const cartInstance = await storefront.cart.retrieve(cartId);
                const serializedCart = cartInstance.serialize();
                if (cartChanged(serializedCart)) {
                    setCart(cartInstance);
                    setStoredCart(serializedCart);
                }
            } catch (err) {
                console.error('Error loading cart from server:', err);
            } finally {
                setLoaded(true);
            }
        };

        const loadCartFromStorage = () => {
            if (storedCart) {
                const cartInstance = new Cart(storedCart, adapter);
                if (cartChanged(cartInstance.serialize())) {
                    setCart(cartInstance);
                }
            }
        };

        if (storedCart) {
            loadCartFromStorage();
        }

        if (!loaded) {
            loadCartFromServer();
        }
    }, [storefront, storedCart, loaded, setStoredCart]);

    // Update the cart: sync instance with storage and emit events
    const updateCart = useCallback(
        (newCart: Cart | null) => {
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
        [setStoredCart]
    );

    return <CartContext.Provider value={{ cart, updateCart, isLoading }}>{children}</CartContext.Provider>;
};

export const useCartContext = (): CartContextType => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCartContext must be used within a CartProvider');
    }
    return context;
};
