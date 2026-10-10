import type { ScreenOverrides, ScreenVariantSelection } from './screens/types';
import type { CustomRoutes, CustomTabs } from './navigation';

export type StorefrontExtensions = {
    /** Compiled-in screen overrides keyed by stable screen id. */
    screens?: ScreenOverrides;
    /** Selects compiled-in screen variants by key (declarative; never loads code). */
    screenVariants?: ScreenVariantSelection;
    /** Screens the build adds, by route name; reachable with navigation.navigate(name). */
    routes?: CustomRoutes;
    /** Tabs the build adds, by tab name (ending in `Tab`); each opens one of `routes`. */
    tabs?: CustomTabs;
};

/** Identity helper that type-checks a storefront build's extensions. */
export function defineStorefrontExtensions(extensions: StorefrontExtensions): StorefrontExtensions {
    return extensions;
}

export { SCREEN_IDS, isScreenId } from './screens/screen-ids';
export type { ScreenId } from './screens/screen-ids';
export type { ScreenParamMap } from './screens/params';
export type { CustomRoute, CustomRoutes, CustomTab, CustomTabs, Edition } from './navigation';
export type {
    StorefrontScreen,
    StorefrontScreenProps,
    StorefrontScreenBaseProps,
    ScreenEntry,
    ScreenLoader,
    ScreenOverrides,
    ScreenVariantSelection,
    ScreenErrorReporter,
} from './screens/types';
export { createScreenRegistry } from './screens/registry';
export type { ScreenRegistry, ScreenRegistryOptions } from './screens/registry';
export { ScreenRegistryProvider, useScreenRegistry } from './screens/ScreenRegistryContext';
export { screenSlot } from './screens/screen-slot';
