import { defineBranding } from './src/branding/define';

/**
 * Build-time branding for this storefront.
 *
 * Values here override the legacy environment keys (APP_THEME, CUSTOM_COLORS,
 * STORE_HEADER_*, …), which in turn override the defaults. For example:
 *
 *     colors: {
 *         preset: 'indigo',
 *         light: { primary: '#0f766e', primaryText: '#ffffff' },
 *     },
 *     appearance: { defaultScheme: 'light', allowUserToggle: false },
 *     components: { productCard: { variant: 'outlined' } },
 *
 * See docs/branding.md for every option.
 */
export default defineBranding({
    schemaVersion: 1,
});
