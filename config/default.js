import { mergeConfigs, config, toBoolean } from '../src/utils/config';
import { toArray } from '../src/utils';
import { faHome, faMagnifyingGlass, faMap, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';

export const DefaultConfig = {
    theme: config('APP_THEME', 'blue'),
    storeNavigator: {
        tabs: toArray(config('STORE_NAVIGATOR_TABS', 'StoreHomeTab,StoreSearchTab,StoreMapTab,StoreCartTab,StoreProfileTab')), // Additional tabs: StoreFoodTruckTab,
        defaultTab: toArray(config('STORE_NAVIGATOR_DEFAULT_TAB', 'StoreHomeTab')),
        tabBarBackgroundColor: config('STORE_NAVIGATOR_TAB_BAR_BG', 'blur'),
    },
    defaultServiceArea: config('DEFAULT_SERVICE_AREA'),
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
};

export function createStorefrontConfig(userConfig = {}) {
    return mergeConfigs(DefaultConfig, userConfig);
}
