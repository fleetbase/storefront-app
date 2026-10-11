import { defineStorefrontExtensions } from './src/extensions';

/**
 * Template for a build's extensions. Don't customize this file: a client build puts
 * its own at brand/storefront.extensions.ts, which is used instead when it exists,
 * so pulling a new release never conflicts with client code. For example:
 *
 *     import { defineStorefrontExtensions } from '../src/extensions';
 *     import { faGift } from '@fortawesome/free-solid-svg-icons';
 *
 *     export default defineStorefrontExtensions({
 *         screens: {
 *             'store.home': { load: () => import('./screens/BrandStoreHomeScreen') },
 *         },
 *         routes: {
 *             Rewards: { load: () => import('./screens/RewardsScreen'), path: 'rewards' },
 *         },
 *         tabs: {
 *             RewardsTab: { initialRoute: 'Rewards', icon: faGift, labelKey: 'Brand.tabs.rewards' },
 *         },
 *     });
 *
 * See docs/extensibility.md for screen ids, routes and tabs.
 */
export default defineStorefrontExtensions({
    screens: {},
    screenVariants: {},
});
