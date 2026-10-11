import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { EventRegister } from 'react-native-event-listeners';
import { getUniqueId } from 'react-native-device-info';
import { Cart } from '@fleetbase/storefront';
import useStorage, { get as getStoredValue, remove as removeStoredValue } from '../hooks/use-storage';
import useStorefront from '../hooks/use-storefront';
import { useStorefrontRuntime } from './StorefrontRuntimeContext';
import { getNetworkCartDecision, getScopedStorageKey, totalCartQuantity } from '../network/network-runtime';
import { requestStoreSwitch } from '../network/store-switch';
import { formatCurrency } from '../utils/format';
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
                // Always adopt the loaded instance: the placeholder set when the scope changes
                // has no id, so keeping it would send adds to `carts/null`.
                setCart(cartInstance);
                if (cartChanged(serializedCart)) setStoredCart(serializedCart);
            } catch (err) {
                console.error('Error loading cart from server:', err);
            } finally {
                setLoaded(true);
            }
        };

        const loadCartFromStorage = (serializedCart: any) => {
            if (serializedCart) setCart(new Cart(serializedCart, storefront.getAdapter()));
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
        (fromStoreId: string | null, toStoreId: string | null, items: any[]) => {
            // The store-switch sheet, when mounted, explains what will be cleared and why.
            const fromSheet = requestStoreSwitch({
                kind: 'replace',
                fromStoreId,
                toStoreId,
                itemCount: totalCartQuantity(items),
                total: cart ? formatCurrency(cart.subtotal?.() ?? 0, cart.getAttribute('currency') ?? 'USD') : null,
            });
            if (fromSheet) return fromSheet;

            return new Promise<boolean>((resolve) => {
                // react-native-web's Alert.alert is a no-op, which would leave this
                // promise pending forever. Use the browser's confirm dialog instead.
                if (Platform.OS === 'web') {
                    const browserConfirm = (globalThis as any).window?.confirm;
                    resolve(typeof browserConfirm === 'function' ? Boolean(browserConfirm.call((globalThis as any).window, `${t('Network.cartReplaceTitle')}\n\n${t('Network.cartReplaceDescription')}`)) : false);
                    return;
                }
                Alert.alert(t('Network.cartReplaceTitle'), t('Network.cartReplaceDescription'), [
                    { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
                    { text: t('Network.replaceCart'), style: 'destructive', onPress: () => resolve(true) },
                ]);
            });
        },
        [cart, t]
    );

    const addProduct = useCallback(
        async (product: any, quantity = 1, data: any = {}, merchant: any = null) => {
            if (!cart) throw new Error(t('Network.cartUnavailable'));
            const targetStoreId = merchant?.id || currentStore?.id || product?.getAttribute?.('store.id');
            const selectedLocation = getSelectedStoreLocation(targetStoreId);
            const storeLocationId = data.store_location || selectedLocation?.id;
            let activeCart = cart;

            if (mode === 'network') {
                if (!targetStoreId) throw new Error(t('Network.missingMerchant'));
                if (!storeLocationId) throw new Error(t('Network.selectStoreLocationFirst'));

                const items = cart.contents?.() || [];
                const multiCartEnabled = ownerInfo?.options?.multi_cart_enabled === true;
                if (getNetworkCartDecision(items, targetStoreId, multiCartEnabled) === 'replace') {
                    const fromStoreId = items.map((item: any) => item?.store_id).find(Boolean) ?? null;
                    const confirmed = await confirmReplacement(fromStoreId, targetStoreId, items);
                    if (!confirmed) throw new Error('CART_REPLACEMENT_CANCELLED');
                    activeCart = await cart.empty();
                    updateCart(activeCart);
                }

                if (multiCartEnabled && items.length > 0) {
                    const currencies = new Set(items.map((item: any) => item.currency || cart.getAttribute('currency')).filter(Boolean));
                    const productCurrency = product?.getAttribute?.('currency');
                    if (productCurrency && currencies.size > 0 && !currencies.has(productCurrency)) {
                        // Explain in the sheet when it is mounted; the caller still gets the error.
                        await requestStoreSwitch({ kind: 'currency', cartCurrency: [...currencies][0] as string, itemCurrency: productCurrency, toStoreId: targetStoreId });
                        throw new Error(t('Network.incompatibleCurrency'));
                    }
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
