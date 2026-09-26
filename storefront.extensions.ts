import { defineStorefrontExtensions } from './src/extensions';

/**
 * Storefront build extensions.
 *
 * Replace any overridable screen without editing the navigators by mapping its
 * stable screen id to a compiled-in implementation, for example:
 *
 *     screens: {
 *         'store.home': { load: () => import('./custom/screens/BrandStoreHomeScreen') },
 *     },
 *
 * See docs/extensibility.md for the list of screen ids and their params.
 */
export default defineStorefrontExtensions({
    screens: {},
    screenVariants: {},
});
