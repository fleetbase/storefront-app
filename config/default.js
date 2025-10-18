import { mergeConfigs, config, toBoolean } from '../src/utils/config';
import { toArray } from '../src/utils';
import { faHome, faMagnifyingGlass, faMap, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';

const backgroundImages = {
    storefront_photo_1: require('../assets/images/storefront-photo-1.jpg'),
    storefront_photo_2: require('../assets/images/storefront-photo-2.jpg'),
};

export const DefaultConfig = {
    theme: config('APP_THEME', 'blue'),
    storeNavigator: {
        tabs: toArray(config('STORE_NAVIGATOR_TABS', 'StoreHomeTab,StoreSearchTab,StoreMapTab,StoreCartTab,StoreProfileTab')), // Additional tabs: StoreFoodTruckTab,
        defaultTab: toArray(config('STORE_NAVIGATOR_DEFAULT_TAB', 'StoreHomeTab')),
        tabBarBackgroundColor: config('STORE_NAVIGATOR_TAB_BAR_BG', 'blur'),
    },
    termsUrl: config('TOS_URL'),
    privacyUrl: config('PRIVACY_URL'),
    defaultMapType: config('DEFAULT_MAP_TYPE', 'standard'),
    defaultServiceArea: config('DEFAULT_SERVICE_AREA'),
    defaultLocale: config('DEFAULT_LOCALE', 'en'),
    availableLocales: toArray(config('AVAILABLE_LOCALES', 'en,mn')),
    paymentGateway: config('PAYMENT_GATEWAY', 'stripe'),
    incrementTipBy: config('TIP_INCREMENT', 50),
    stripePaymentMethod: config('STRIPE_PAYMENT_UI', 'sheet'), // `sheet` or `field`
    stripePaymentSheetOptions: {
        applePay: toBoolean(config('STRIPE_ENABLE_APPLE_PAY', false)),
        googlePay: toBoolean(config('STRIPE_ENABLE_GOOGLE_PAY', false)),
    },
    disableGeocodingScreen: toBoolean(config('DISABLE_GEOCODING_SCREEN', false)),
    showDriversOnMap: toBoolean(config('MAP_DISPLAY_DRIVERS', false)),
    prioritizePickup: toBoolean(config('PRIORITIZE_PICKUP', false)),
    storeCategoriesDisplay: config('STORE_CATEGORIES_DISPLAY', 'grid'), // `pills` or `grid`
    productCardStyle: config('PRODUCT_CARD_STYLE', 'bordered'), // `bordered`, `outlined`, `visio`
    backgroundImages: {
        LoginScreen: backgroundImages[config('LOGIN_BG_IMAGE', 'storefront_photo_1')],
        BootScreen: backgroundImages[config('BOOTSCREEN_BG_IMAGE')] ?? null,
    },
    storeHeader: {
        showGradient: toBoolean(config('STORE_HEADER_SHOW_GRADIENT', 1)),
        showLocationPicker: toBoolean(config('STORE_HEADER_SHOW_LOCATION_PICKER', 1)),
        showTitle: toBoolean(config('STORE_HEADER_SHOW_TITLE', 1)),
        showDescription: toBoolean(config('STORE_HEADER_SHOW_DESCRIPTION', 1)),
        showLogo: toBoolean(config('STORE_HEADER_SHOW_LOGO', 1)),
        logoHeight: parseInt(config('STORE_HEADER_LOGO_HEIGHT', 45)),
        logoWidth: parseInt(config('STORE_HEADER_LOGO_WIDTH', 45)),
    },
    styles: {
        StoreHeader: {
            direction: config('STORE_HEADER_FLEX_DIRECTION', 'column'),
            alignItems: config('STORE_HEADER_ALIGN_ITEMS', 'center'),
            justifyContent: config('STORE_HEADER_JUSTIFY_CONTENT', 'flex-end'),
            space: config('STORE_HEADER_SPACING', '$1'),
            paddingTop: config('STORE_HEADER_PADDING_TOP', 0),
            paddingBottom: config('STORE_HEADER_PADDING_BOTTOM', 0),
            paddingLeft: config('STORE_HEADER_PADDING_LEFT', 0),
            paddingRight: config('STORE_HEADER_PADDING_RIGHT', 0),
        },
    },
};

export function createStorefrontConfig(userConfig = {}) {
    return mergeConfigs(DefaultConfig, userConfig);
}
