import { defineBranding } from './src/branding/define';

/**
 * Template for a build's branding. Don't customize this file: a client build puts its
 * own at brand/storefront.brand.ts, which is used instead when it exists, so pulling a
 * new release never conflicts with client branding. For example:
 *
 *     import { defineBranding } from '../src/branding/define';
 *
 *     export default defineBranding({
 *         schemaVersion: 1,
 *         colors: { preset: 'green', light: { primary: '#0f766e', primaryText: '#ffffff' } },
 *         typography: {
 *             body: { family: 'Plus Jakarta Sans', faces: { 400: 'PlusJakartaSans-Regular', 700: 'PlusJakartaSans-Bold' } },
 *             scale: 1.05,
 *         },
 *         appearance: { defaultScheme: 'light', allowUserToggle: false },
 *         components: { productCard: { variant: 'outlined' } },
 *     });
 *
 * Values here override the legacy environment keys (APP_THEME, CUSTOM_COLORS,
 * STORE_HEADER_*, …), which in turn override the defaults. See docs/branding.md.
 */
export default defineBranding({
    schemaVersion: 1,
});
