import { mergeConfigs, config, toBoolean } from '../src/utils/config';
import { toArray } from '../src/utils';
import { getBuildBranding } from '../src/branding/build-branding';
import { resolveAssetSource } from '../src/branding/assets';

// Presentation settings (theme, navigation, header, cards, imagery) come from the
// resolved build branding: storefront.brand.ts over the legacy env keys over defaults.
const { branding } = getBuildBranding();
const storeHeader = branding.components.storeHeader;

export const DefaultConfig = {
    theme: branding.preset,
    storeNavigator: {
        tabs: branding.navigation.store.tabs,
        defaultTab: [branding.navigation.store.defaultTab],
        tabBarBackgroundColor: branding.navigation.store.tabBar.background,
    },
    // `foodTrucks` opens the app on the food trucks map instead of the store or Network home.
    homeScreen: branding.navigation.home ?? 'store',
    networkNavigator: {
        foodTrucks: branding.navigation.home === 'foodTrucks' || branding.navigation.network?.foodTrucks === true,
    },
    termsUrl: config('TOS_URL'),
    privacyUrl: config('PRIVACY_URL'),
    defaultMapType: config('DEFAULT_MAP_TYPE', 'standard'),
    defaultServiceArea: config('DEFAULT_SERVICE_AREA'),
    defaultLocale: config('DEFAULT_LOCALE', 'en'),
    availableLocales: toArray(config('AVAILABLE_LOCALES', 'en,mn,uk')),
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
    storeCategoriesDisplay: branding.components.storeCategories.display, // `pills` or `grid`
    productCardStyle: branding.components.productCard.variant, // `bordered`, `outlined`, `visio`
    backgroundImages: {
        LoginScreen: resolveAssetSource(branding.assets.loginBackground) ?? undefined,
        BootScreen: resolveAssetSource(branding.assets.bootBackground),
    },
    bootBackgroundColors: branding.boot.background,
    storeHeader: {
        showGradient: storeHeader.showGradient,
        showLocationPicker: storeHeader.showLocationPicker,
        showTitle: storeHeader.showTitle,
        showDescription: storeHeader.showDescription,
        showLogo: storeHeader.showLogo,
        logoHeight: storeHeader.logoHeight,
        logoWidth: storeHeader.logoWidth,
    },
    styles: {
        StoreHeader: {
            direction: storeHeader.direction,
            alignItems: storeHeader.alignItems,
            justifyContent: storeHeader.justifyContent,
            space: storeHeader.spacing,
            paddingTop: storeHeader.paddingTop,
            paddingBottom: storeHeader.paddingBottom,
            paddingLeft: storeHeader.paddingLeft,
            paddingRight: storeHeader.paddingRight,
        },
    },
};

export function createStorefrontConfig(userConfig = {}) {
    return mergeConfigs(DefaultConfig, userConfig);
}
