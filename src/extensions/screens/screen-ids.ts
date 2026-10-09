/**
 * Stable identifiers for screens that a storefront build may replace.
 *
 * These ids are a public contract for brand overrides and declarative
 * configuration. React Navigation route names may change; these must not.
 * Boot, location permission and payment gateway screens are intentionally not
 * overridable.
 */
export const SCREEN_IDS = [
    'store.home',
    'store.search',
    'store.map',
    'store.info',
    'store.catalog',
    'catalog.category',
    'catalog.index',
    'catalog.foodTruckCategory',
    'product.detail',
    'cart',
    'cart.item',
    'checkout',
    'order.detail',
    'order.receipt',
    'order.history',
    'account.profile',
    'account.details',
    'auth.login',
    'auth.createAccount',
    'network.home',
    'network.directory',
    'network.search',
    'network.map',
    'network.store',
    'network.product',
    'reviews.list',
    'reviews.write',
    'offers.list',
    'offers.detail',
    'notifications.inbox',
    'notifications.settings',
    'order.chat',
] as const;

export type ScreenId = (typeof SCREEN_IDS)[number];

export function isScreenId(value: unknown): value is ScreenId {
    return typeof value === 'string' && (SCREEN_IDS as readonly string[]).includes(value);
}
