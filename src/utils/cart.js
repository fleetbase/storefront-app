import { Cart } from '@fleetbase/storefront';
import { adapter } from '../hooks/use-storefront';
import { getMap } from './storage';

export function canAddProductToCart(cart, product, currentStore = null) {
    const info = getMap('info');
    const isNetwork = info.is_network;
    const isMultiCartEnabled = info.options.multi_cart_enabled === true;

    if (isNetwork && isMultiCartEnabled === true && cart.isNotEmpty) {
        return cart.contents().every((cartItem) => currentStore && cartItem.store_id !== currentStore.id);
    }

    return false;
}

export function getCart() {
    const cart = getMap('cart');
    if (cart) {
        return new Cart(cart, adapter);
    }

    return null;
}

export function getCartContents() {
    const cart = getCart();
    return cart ? cart.contents() : [];
}

export function getCartCount() {
    return getCartContents().length;
}
