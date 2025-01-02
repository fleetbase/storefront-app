import { mergeConfigs, config, toBoolean } from '../src/utils';
import { faHome, faMagnifyingGlass, faMap, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';

export const DefaultConfig = {
    theme: config('APP_THEME', 'blue'),
    paymentGateway: config('PAYMENT_GATEWAY', 'stripe'),
    incrementTipBy: config('TIP_INCREMENT', 50),
    stripePaymentMethod: config('STRIPE_PAYMENT_UI', 'sheet'), // `sheet` or `field`
    stripePaymentSheetOptions: {
        applePay: toBoolean(config('STRIPE_ENABLE_APPLE_PAY', false)),
        googlePay: toBoolean(config('STRIPE_ENABLE_GOOGLE_PAY', false)),
    },
    showDriversOnMap: toBoolean(config('MAP_DISPLAY_DRIVERS', false)),
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
