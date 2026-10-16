import { isSemanticColorKey } from './presets';
import type { BrandingConfig } from './schema';

export type EnvReader = (key: string) => string | undefined | null;

const present = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

function parsePairs(value: string | undefined | null): Record<string, string> {
    if (!present(value)) return {};
    return value.split(',').reduce<Record<string, string>>((pairs, pair) => {
        const index = pair.indexOf(':');
        if (index > 0) {
            const key = pair.slice(0, index).trim();
            const color = pair.slice(index + 1).trim();
            if (key && color) pairs[key] = color;
        }
        return pairs;
    }, {});
}

function splitColors(pairs: Record<string, string>) {
    const semantic: Record<string, string> = {};
    const extra: Record<string, string> = {};
    for (const [key, value] of Object.entries(pairs)) {
        (isSemanticColorKey(key) ? semantic : extra)[key] = value;
    }
    return { semantic, extra };
}

// Matches the historical `toBoolean` helper used for these env keys.
const toBoolean = (value: string) => ['true', '1'].includes(value.trim().toLowerCase());

const toList = (value: string) =>
    value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const toSpacing = (value: string): number | string => (/^-?\d+(\.\d+)?$/.test(value.trim()) ? Number(value) : value.trim());

const assignIfPresent = <T>(target: Record<string, any>, key: string, value: string | undefined | null, transform: (value: string) => T) => {
    if (present(value)) target[key] = transform(value);
};

/**
 * Maps the storefront's legacy environment keys (APP_THEME, CUSTOM_COLORS*,
 * STORE_HEADER_*, PRODUCT_CARD_STYLE, …) onto a branding config. Only keys that
 * are set are included, so defaults apply to everything else. Values are not
 * validated here; the resolver validates and drops invalid sections.
 */
export function brandingFromLegacyEnv(env: EnvReader): BrandingConfig {
    const branding: BrandingConfig = { schemaVersion: 1 };

    // Colors
    const colors: Record<string, any> = {};
    assignIfPresent(colors, 'preset', env('APP_THEME'), (value) => value.trim().toLowerCase());
    const shared = splitColors(parsePairs(env('CUSTOM_COLORS')));
    const light = splitColors(parsePairs(env('CUSTOM_COLORS_LIGHT')));
    const dark = splitColors(parsePairs(env('CUSTOM_COLORS_DARK')));
    const lightColors = { ...shared.semantic, ...light.semantic };
    const darkColors = { ...shared.semantic, ...dark.semantic };
    if (Object.keys(lightColors).length) colors.light = lightColors;
    if (Object.keys(darkColors).length) colors.dark = darkColors;
    const extra: Record<string, any> = {};
    if (Object.keys(shared.extra).length) extra.all = shared.extra;
    if (Object.keys(light.extra).length) extra.light = light.extra;
    if (Object.keys(dark.extra).length) extra.dark = dark.extra;
    if (Object.keys(extra).length) colors.extra = extra;
    if (Object.keys(colors).length) branding.colors = colors;

    // Components
    const components: Record<string, any> = {};
    if (present(env('PRODUCT_CARD_STYLE'))) components.productCard = { variant: env('PRODUCT_CARD_STYLE')!.trim() };
    if (present(env('STORE_CATEGORIES_DISPLAY'))) components.storeCategories = { display: env('STORE_CATEGORIES_DISPLAY')!.trim() };
    const header: Record<string, any> = {};
    assignIfPresent(header, 'showGradient', env('STORE_HEADER_SHOW_GRADIENT'), toBoolean);
    assignIfPresent(header, 'showLocationPicker', env('STORE_HEADER_SHOW_LOCATION_PICKER'), toBoolean);
    assignIfPresent(header, 'showTitle', env('STORE_HEADER_SHOW_TITLE'), toBoolean);
    assignIfPresent(header, 'showDescription', env('STORE_HEADER_SHOW_DESCRIPTION'), toBoolean);
    assignIfPresent(header, 'showLogo', env('STORE_HEADER_SHOW_LOGO'), toBoolean);
    assignIfPresent(header, 'logoHeight', env('STORE_HEADER_LOGO_HEIGHT'), (value) => parseInt(value, 10));
    assignIfPresent(header, 'logoWidth', env('STORE_HEADER_LOGO_WIDTH'), (value) => parseInt(value, 10));
    assignIfPresent(header, 'direction', env('STORE_HEADER_FLEX_DIRECTION'), (value) => value.trim());
    assignIfPresent(header, 'alignItems', env('STORE_HEADER_ALIGN_ITEMS'), (value) => value.trim());
    assignIfPresent(header, 'justifyContent', env('STORE_HEADER_JUSTIFY_CONTENT'), (value) => value.trim());
    assignIfPresent(header, 'spacing', env('STORE_HEADER_SPACING'), toSpacing);
    assignIfPresent(header, 'paddingTop', env('STORE_HEADER_PADDING_TOP'), toSpacing);
    assignIfPresent(header, 'paddingBottom', env('STORE_HEADER_PADDING_BOTTOM'), toSpacing);
    assignIfPresent(header, 'paddingLeft', env('STORE_HEADER_PADDING_LEFT'), toSpacing);
    assignIfPresent(header, 'paddingRight', env('STORE_HEADER_PADDING_RIGHT'), toSpacing);
    if (Object.keys(header).length) components.storeHeader = header;
    if (Object.keys(components).length) branding.components = components;

    // Assets
    const assets: Record<string, any> = {};
    assignIfPresent(assets, 'loginBackground', env('LOGIN_BG_IMAGE'), (value) => ({ bundled: value.trim() }));
    assignIfPresent(assets, 'bootBackground', env('BOOTSCREEN_BG_IMAGE'), (value) => ({ bundled: value.trim() }));
    if (Object.keys(assets).length) branding.assets = assets;

    // Boot screen
    if (present(env('BOOTSCREEN_BACKGROUND_COLOR'))) branding.boot = { background: toList(env('BOOTSCREEN_BACKGROUND_COLOR')!) };

    // Navigation
    const store: Record<string, any> = {};
    assignIfPresent(store, 'tabs', env('STORE_NAVIGATOR_TABS'), toList);
    assignIfPresent(store, 'defaultTab', env('STORE_NAVIGATOR_DEFAULT_TAB'), (value) => toList(value)[0]);
    assignIfPresent(store, 'tabBar', env('STORE_NAVIGATOR_TAB_BAR_BG'), (value) => ({ background: value.trim() }));
    const navigation: Record<string, any> = {};
    if (Object.keys(store).length) navigation.store = store;
    const home = env('HOME_SCREEN');
    if (present(home)) navigation.home = home!.trim() === 'foodTrucks' ? 'foodTrucks' : 'store';
    if (present(env('NETWORK_FOOD_TRUCKS_TAB'))) navigation.network = { foodTrucks: ['1', 'true', 'yes'].includes(env('NETWORK_FOOD_TRUCKS_TAB')!.trim().toLowerCase()) };
    if (Object.keys(navigation).length) branding.navigation = navigation;

    return branding;
}

/** Legacy env keys mapped into branding, for documentation and deprecation notices. */
export const LEGACY_BRANDING_ENV_KEYS = [
    'APP_THEME',
    'CUSTOM_COLORS',
    'CUSTOM_COLORS_LIGHT',
    'CUSTOM_COLORS_DARK',
    'PRODUCT_CARD_STYLE',
    'STORE_CATEGORIES_DISPLAY',
    'STORE_HEADER_SHOW_GRADIENT',
    'STORE_HEADER_SHOW_LOCATION_PICKER',
    'STORE_HEADER_SHOW_TITLE',
    'STORE_HEADER_SHOW_DESCRIPTION',
    'STORE_HEADER_SHOW_LOGO',
    'STORE_HEADER_LOGO_HEIGHT',
    'STORE_HEADER_LOGO_WIDTH',
    'STORE_HEADER_FLEX_DIRECTION',
    'STORE_HEADER_ALIGN_ITEMS',
    'STORE_HEADER_JUSTIFY_CONTENT',
    'STORE_HEADER_SPACING',
    'STORE_HEADER_PADDING_TOP',
    'STORE_HEADER_PADDING_BOTTOM',
    'STORE_HEADER_PADDING_LEFT',
    'STORE_HEADER_PADDING_RIGHT',
    'LOGIN_BG_IMAGE',
    'BOOTSCREEN_BG_IMAGE',
    'BOOTSCREEN_BACKGROUND_COLOR',
    'STORE_NAVIGATOR_TABS',
    'STORE_NAVIGATOR_DEFAULT_TAB',
    'STORE_NAVIGATOR_TAB_BAR_BG',
    'HOME_SCREEN',
    'NETWORK_FOOD_TRUCKS_TAB',
] as const;
