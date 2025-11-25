import { Cart } from '@fleetbase/storefront';
import { adapter } from '../hooks/use-storefront';
import { getMap } from './storage';
import { isArray } from './';

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

export function productInCart(product) {
    const contents = getCartContents();
    if (contents) {
        return contents.some((item) => item.product_id === product.id);
    }

    return false;
}

export function calculateProductSubtotal(product, variations = {}, addons = {}) {
    // Start with the base product price
    let sum = Number(product.isOnSale ? product.getAttribute('sale_price') : product.getAttribute('price')) || 0;

    // Add variation costs
    for (const variationId in variations) {
        const variant = variations[variationId];
        if (variant && variant.additional_cost) {
            sum += Number(variant.additional_cost) || 0;
        }
    }

    // Add addon costs
    for (const addonCategoryId in addons) {
        if (isArray(addons[addonCategoryId])) {
            addons[addonCategoryId].forEach((addon) => {
                if (addon) {
                    const addonCost = addon.is_on_sale ? addon.sale_price : addon.price;
                    sum += Number(addonCost) || 0;
                }
            });
        }
    }

    return sum;
}

export function cartHasProduct(product) {
    const cart = getCart();
    return cart ? cart.hasProduct(product.id) : false;
}

export function getProductCartItem(product) {
    const contents = getCartContents();
    if (contents) {
        return contents.find((item) => item.product_id === product.id);
    }

    return null;
}

export function getCartItem(cartItemId) {
    const contents = getCartContents();
    if (contents) {
        return contents.find((item) => item.id === cartItemId);
    }

    return null;
}

export function calculateCartTotal(cart = null) {
    cart = cart === null ? getCart() : cart;
    let subtotal = cart?.subtotal() ?? 0;

    if (cart.isEmpty) {
        return 0;
    }

    //  if (isTipping) {
    //      if (typeof tip === 'string' && tip.endsWith('%')) {
    //          subtotal += calculatePercentage(parseInt(tip), cart.subtotal());
    //      } else {
    //          subtotal += tip;
    //      }
    //  }

    //  if (isTippingDriver && !isPickupOrder) {
    //      if (typeof deliveryTip === 'string' && deliveryTip.endsWith('%')) {
    //          subtotal += calculatePercentage(parseInt(deliveryTip), cart.subtotal());
    //      } else {
    //          subtotal += deliveryTip;
    //      }
    //  }

    //  if (isPickupOrder) {
    //      return subtotal;
    //  }

    return subtotal;
}
