import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { EventRegister } from 'react-native-event-listeners';
import { getUniqueId } from 'react-native-device-info';
import { Cart } from '@fleetbase/storefront';
import useStorage, { get as getStoredValue, remove as removeStoredValue } from '../hooks/use-storage';
import useStorefront from '../hooks/use-storefront';
import { useStorefrontRuntime } from './StorefrontRuntimeContext';
import { getMarketplaceCartDecision, getScopedStorageKey } from '../utils/marketplace-runtime';
import { useLanguage } from './LanguageContext';

const { emit } = EventRegister;

type CartContextType = {
    cart: Cart | null;
    updateCart: (newCart: Cart | null) => void;
    addProduct: (product: any, quantity?: number, data?: any, merchant?: any) => Promise<Cart>;
    isLoading: boolean;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const { storefront } = useStorefront();
    const { t } = useLanguage();
    const { mode, ownerInfo, currentStore, getSelectedStoreLocation } = useStorefrontRuntime();
    const adapter = storefront?.getAdapter();
    const scope = ownerInfo?.id || 'unconfigured';
    const [storedCart, setStoredCart] = useStorage<any>(getScopedStorageKey(scope, 'cart'), null);
    const [cart, setCart] = useState<Cart | null>(adapter ? new Cart(storedCart || { items: [] }, adapter) : null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setLoaded(false);
        setCart(adapter ? new Cart({ items: [] }, adapter) : null);
    }, [adapter, scope]);

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
                const deviceId = await getUniqueId();
                const cartId = `${deviceId}-${scope}`;
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

        const loadCartFromStorage = (serializedCart: any) => {
            if (serializedCart) {
                const cartInstance = new Cart(serializedCart, storefront.getAdapter());
                if (cartChanged(cartInstance.serialize())) {
                    setCart(cartInstance);
                }
            }
        };

        const legacyCart = mode === 'store' && scope !== 'unconfigured' ? getStoredValue('cart') : null;
        const persistedCart = storedCart || legacyCart;
        if (persistedCart) {
            loadCartFromStorage(persistedCart);
            if (!storedCart && legacyCart) {
                setStoredCart(legacyCart);
                removeStoredValue('cart');
                setLoaded(true);
                return;
            }
        }

        if (!loaded) {
            loadCartFromServer();
        }
    }, [scope, storefront, storedCart, loaded, mode, setStoredCart]);

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
            const cartInstance = newCart instanceof Cart ? newCart : new Cart(newCart, storefront?.getAdapter());

            // Persist serialized cart and update state
            setStoredCart(cartInstance.serialize());
            setCart(cartInstance);

            emit('cart.updated', cartInstance);
        },
        [setStoredCart, storefront]
    );

    const confirmReplacement = useCallback(
        () =>
            new Promise<boolean>((resolve) => {
                Alert.alert(t('Marketplace.cartReplaceTitle'), t('Marketplace.cartReplaceDescription'), [
                    { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
                    { text: t('Marketplace.replaceCart'), style: 'destructive', onPress: () => resolve(true) },
                ]);
            }),
        [t]
    );

    const addProduct = useCallback(
        async (product: any, quantity = 1, data: any = {}, merchant: any = null) => {
            if (!cart) throw new Error(t('Marketplace.cartUnavailable'));
            const targetStoreId = merchant?.id || currentStore?.id || product?.getAttribute?.('store.id');
            const selectedLocation = getSelectedStoreLocation(targetStoreId);
            const storeLocationId = data.store_location || selectedLocation?.id;
            let activeCart = cart;

            if (mode === 'marketplace') {
                if (!targetStoreId) throw new Error(t('Marketplace.missingMerchant'));
                if (!storeLocationId) throw new Error(t('Marketplace.selectStoreLocationFirst'));

                const items = cart.contents?.() || [];
                const multiCartEnabled = ownerInfo?.options?.multi_cart_enabled === true;
                if (getMarketplaceCartDecision(items, targetStoreId, multiCartEnabled) === 'replace') {
                    const confirmed = await confirmReplacement();
                    if (!confirmed) throw new Error('CART_REPLACEMENT_CANCELLED');
                    activeCart = await cart.empty();
                    updateCart(activeCart);
                }

                if (multiCartEnabled && items.length > 0) {
                    const currencies = new Set(items.map((item: any) => item.currency || cart.getAttribute('currency')).filter(Boolean));
                    const productCurrency = product?.getAttribute?.('currency');
                    if (productCurrency && currencies.size > 0 && !currencies.has(productCurrency)) throw new Error(t('Marketplace.incompatibleCurrency'));
                }
            }

            const updated = await activeCart.add(product.id, quantity, { ...data, store_location: storeLocationId });
            updateCart(updated);
            return updated;
        },
        [cart, confirmReplacement, currentStore?.id, getSelectedStoreLocation, mode, ownerInfo?.options?.multi_cart_enabled, t, updateCart]
    );

    return <CartContext.Provider value={{ cart, updateCart, addProduct, isLoading: !loaded }}>{children}</CartContext.Provider>;
};

export const useCartContext = (): CartContextType => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCartContext must be used within a CartProvider');
    }
    return context;
};
