import { mergeConfigs, config, toBoolean } from '../src/utils/config';
import { faHome, faMagnifyingGlass, faMap, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';

export const DefaultConfig = {
    theme: config('APP_THEME', 'blue'),
    defaultLocale: config('DEFAULT_LOCALE', 'en'),
    paymentGateway: config('PAYMENT_GATEWAY', 'stripe'),
    incrementTipBy: config('TIP_INCREMENT', 50),
    stripePaymentMethod: config('STRIPE_PAYMENT_UI', 'sheet'), // `sheet` or `field`
    stripePaymentSheetOptions: {
        applePay: toBoolean(config('STRIPE_ENABLE_APPLE_PAY', false)),
        googlePay: toBoolean(config('STRIPE_ENABLE_GOOGLE_PAY', false)),
    },
    showDriversOnMap: toBoolean(config('MAP_DISPLAY_DRIVERS', false)),
    prioritizePickup: toBoolean(config('PRIORITIZE_PICKUP', false)),
    storeCategoriesDisplay: config('STORE_CATEGORIES_DISPLAY', 'grid'), // `pills` or `grid`
    productCardStyle: config('PRODUCT_CARD_STYLE', 'bordered'), // `bordered`, `outlined`, `visio`
    backgroundImages: {
        LoginScreen: require('../assets/images/storefront-photo-1.jpg'),
    },
    styles: {
        StoreHeader: {
            direction: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            space: '$1',
            padding: '$4',
        },
    },
    tabs: [
        {
            name: 'StoreHomeTab',
            icon: faHome,
            label: 'Home',
        },
        {
            name: 'StoreSearchTab',
            icon: faMagnifyingGlass,
            label: 'Search',
        },
        {
            name: 'StoreMapTab',
            icon: faMap,
            label: 'Map',
        },
        {
            name: 'StoreCartTab',
            icon: faShoppingCart,
            label: 'Cart',
        },
        {
            name: 'StoreProfileTab',
            icon: faUser,
            label: 'Profile',
        },
    ],
};

export function createStorefrontConfig(userConfig = {}) {
    return mergeConfigs(DefaultConfig, userConfig);
}
