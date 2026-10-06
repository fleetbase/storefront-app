import type { BrandingConfig } from './schema';

/**
 * Defaults applied beneath every other branding source. They match the
 * storefront's historical defaults so an unbranded build looks unchanged.
 */
export const DEFAULT_BRANDING: Required<Omit<BrandingConfig, 'name'>> = {
    schemaVersion: 1,
    colors: { preset: 'blue', light: {}, dark: {}, extra: {} },
    appearance: { defaultScheme: 'system', allowUserToggle: true },
    components: {
        productCard: { variant: 'bordered' },
        storeCategories: { display: 'grid' },
        storeHeader: {
            showGradient: true,
            showLocationPicker: true,
            showTitle: true,
            showDescription: true,
            showLogo: true,
            logoHeight: 45,
            logoWidth: 45,
            direction: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            spacing: '$1',
            paddingTop: 0,
            paddingBottom: 0,
            paddingLeft: 0,
            paddingRight: 0,
        },
    },
    assets: { loginBackground: { bundled: 'storefront_photo_1' }, bootBackground: null },
    boot: { background: ['$background'] },
    navigation: {
        store: {
            tabs: ['StoreHomeTab', 'StoreSearchTab', 'StoreMapTab', 'StoreCartTab', 'StoreProfileTab'],
            defaultTab: 'StoreHomeTab',
            tabBar: { background: 'blur' },
        },
    },
    screens: {},
};
