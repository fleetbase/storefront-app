import { brandingFromLegacyEnv } from '../../src/branding/legacy-env';
import { resolveBranding } from '../../src/branding/resolve';

const reader = (env: Record<string, string>) => (key: string) => env[key];
const resolveEnv = (env: Record<string, string>) => resolveBranding([{ name: 'legacy-env', config: brandingFromLegacyEnv(reader(env)) }]);

// Branding-related keys copied from the repository's storefront profiles (no secrets).
const PROFILES: Record<string, Record<string, string>> = {
    'true-vegan': {
        STORE_CATEGORIES_DISPLAY: 'pills',
        PRODUCT_CARD_STYLE: 'outlined',
        BOOTSCREEN_BACKGROUND_COLOR: '#345A73',
        CUSTOM_COLORS: 'custom:#345A73,customBorder:#345A73,customText:#F0EEEC',
        STORE_NAVIGATOR_TAB_BAR_BG: 'custom',
        APP_THEME: 'truevegan',
        LOGIN_BG_IMAGE: 'storefront_photo_2',
        BOOTSCREEN_BG_IMAGE: 'storefront_photo_2',
        STORE_HEADER_SHOW_GRADIENT: '0',
        STORE_HEADER_SHOW_LOCATION_PICKER: '0',
        STORE_HEADER_SHOW_TITLE: '0',
        STORE_HEADER_SHOW_DESCRIPTION: '0',
        STORE_HEADER_LOGO_HEIGHT: '225',
        STORE_HEADER_LOGO_WIDTH: '225',
        STORE_HEADER_JUSTIFY_CONTENT: 'center',
        STORE_HEADER_PADDING_TOP: '$10',
    },
    'oli-max': {
        BOOTSCREEN_BACKGROUND_COLOR: '#ff3a44,#f67d04',
        STORE_NAVIGATOR_TABS: 'StoreFoodTruckTab,StoreCartTab,StoreProfileTab',
        STORE_NAVIGATOR_DEFAULT_TAB: 'StoreFoodTruckTab',
        PRODUCT_CARD_STYLE: 'outlined',
    },
    'fleetbase-dev': { STORE_CATEGORIES_DISPLAY: 'pills', PRODUCT_CARD_STYLE: 'outlined', BOOTSCREEN_BACKGROUND_COLOR: '#ffffff' },
};

describe('legacy env branding', () => {
    test('an empty environment resolves to the historical defaults', () => {
        const { branding, issues } = resolveEnv({});
        expect(issues).toEqual([]);
        expect(branding.preset).toBe('blue');
        expect(branding.components.productCard.variant).toBe('bordered');
        expect(branding.components.storeCategories.display).toBe('grid');
        expect(branding.navigation.store.tabs).toEqual(['StoreHomeTab', 'StoreSearchTab', 'StoreMapTab', 'StoreCartTab', 'StoreProfileTab']);
        expect(branding.navigation.store.tabBar.background).toBe('blur');
        expect(branding.assets.loginBackground).toEqual({ bundled: 'storefront_photo_1' });
        expect(branding.boot.background).toEqual(['$background']);
    });

    test.each(Object.keys(PROFILES))('profile %s resolves without issues', (profile) => {
        expect(resolveEnv(PROFILES[profile]).issues).toEqual([]);
    });

    test('maps the true-vegan profile', () => {
        const { branding } = resolveEnv(PROFILES['true-vegan']);
        expect(branding.preset).toBe('truevegan');
        expect(branding.colors.light.primary).toBe('#345A73');
        expect(branding.extraColors.light).toEqual({ custom: '#345A73', customBorder: '#345A73', customText: '#F0EEEC' });
        expect(branding.extraColors.dark).toEqual(branding.extraColors.light);
        expect(branding.navigation.store.tabBar.background).toBe('custom');
        expect(branding.components.storeCategories.display).toBe('pills');
        expect(branding.components.productCard.variant).toBe('outlined');
        expect(branding.assets).toEqual({ loginBackground: { bundled: 'storefront_photo_2' }, bootBackground: { bundled: 'storefront_photo_2' } });
        expect(branding.boot.background).toEqual(['#345A73']);
        expect(branding.components.storeHeader).toMatchObject({
            showGradient: false,
            showLocationPicker: false,
            showTitle: false,
            showDescription: false,
            showLogo: true,
            logoHeight: 225,
            logoWidth: 225,
            justifyContent: 'center',
            paddingTop: '$10',
            paddingBottom: 0,
        });
    });

    test('maps the oli-max profile', () => {
        const { branding } = resolveEnv(PROFILES['oli-max']);
        expect(branding.navigation.store.tabs).toEqual(['StoreFoodTruckTab', 'StoreCartTab', 'StoreProfileTab']);
        expect(branding.navigation.store.defaultTab).toBe('StoreFoodTruckTab');
        expect(branding.boot.background).toEqual(['#ff3a44', '#f67d04']);
    });

    test('splits semantic and extra custom colors per scheme', () => {
        const { branding } = resolveEnv({ CUSTOM_COLORS: 'primary:#0f766e,brand:#0f766e', CUSTOM_COLORS_DARK: 'primary:#14b8a6' });
        expect(branding.colors.light.primary).toBe('#0f766e');
        expect(branding.colors.dark.primary).toBe('#14b8a6');
        expect(branding.extraColors.light).toEqual({ brand: '#0f766e' });
    });

    test('drops invalid legacy values but keeps the rest', () => {
        const { branding, issues } = resolveEnv({ APP_THEME: 'purple-haze', CUSTOM_COLORS: 'primary:not-a-color,custom:#345A73', PRODUCT_CARD_STYLE: 'fancy', STORE_NAVIGATOR_TABS: 'StoreHomeTab,UnknownTab' });
        expect(branding.preset).toBe('blue');
        expect(branding.colors.light.primary).toBe('#2563eb');
        expect(branding.extraColors.light).toEqual({ custom: '#345A73' });
        expect(branding.components.productCard.variant).toBe('bordered');
        expect(branding.navigation.store.tabs).toContain('StoreProfileTab');
        expect(issues.map((issue) => issue.path)).toEqual(expect.arrayContaining(['colors.preset', 'colors.light.primary', 'components.productCard.variant', 'navigation.store.tabs']));
    });
});
