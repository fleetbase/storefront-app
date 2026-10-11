import React, { Suspense } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Text, YStack } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { createLoadable } from './screens/loadable';
import ScreenErrorBoundary from './screens/ScreenErrorBoundary';
import { ScreenLoading } from './screens/ScreenFallbacks';
import type { LoadableComponent } from './screens/types';

export type Edition = 'store' | 'network';

/** A screen a build adds to the app, reachable with `navigation.navigate(name, params)`. */
export type CustomRoute = {
    /** Loads the screen: `() => import('./screens/RewardsScreen')`. */
    load: () => Promise<{ default: React.ComponentType<any> } | React.ComponentType<any>>;
    /** `card` (default) pushes the screen; `modal` presents it over the current one. */
    presentation?: 'card' | 'modal';
    /** Deep link / web URL path, e.g. `rewards` or `rewards/:rewardId`. */
    path?: string;
    /** Which editions get the route (default: both). */
    editions?: Edition[];
};

/** A tab a build adds to the tab bar. */
export type CustomTab = {
    /** The custom route the tab opens on. */
    initialRoute: string;
    /** A FontAwesome icon, or a render function for any other icon. */
    icon: IconDefinition | ((props: { color: string; size: number; focused: boolean }) => React.ReactNode);
    /** A translation key (e.g. from brand/translations), or the label itself. */
    labelKey?: string;
    label?: string | Record<string, string>;
    /** Which editions get the tab (default: both). */
    editions?: Edition[];
    /**
     * Where the tab goes when the tab list doesn't name it: an index into the tabs
     * (0 = first). Defaults to just before the cart.
     */
    position?: number;
    /** Open the app on this tab. */
    initial?: boolean;
};

export type CustomRoutes = Record<string, CustomRoute>;
export type CustomTabs = Record<string, CustomTab>;

const ROUTE_NAME = /^[A-Z][A-Za-z0-9]{0,47}$/;
const TAB_NAME = /^[A-Z][A-Za-z0-9]{0,44}Tab$/;

const forEdition = <T extends { editions?: Edition[] }>(entries: Record<string, T>, edition: Edition) =>
    Object.entries(entries ?? {}).filter(([, entry]) => !entry.editions || entry.editions.includes(edition));

const warnOrThrow = (message: string) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) throw new Error(message);
    console.warn(message);
};

/** Checks a build's routes and tabs; invalid entries throw in development and are dropped otherwise. */
export function validateCustomNavigation(routes: CustomRoutes = {}, tabs: CustomTabs = {}): { routes: CustomRoutes; tabs: CustomTabs } {
    const validRoutes: CustomRoutes = {};
    for (const [name, route] of Object.entries(routes ?? {})) {
        if (!ROUTE_NAME.test(name) || typeof route?.load !== 'function') {
            warnOrThrow(`[extensions] Invalid custom route "${name}": expected a PascalCase name and { load: () => import(...) }.`);
            continue;
        }
        validRoutes[name] = route;
    }
    const validTabs: CustomTabs = {};
    for (const [name, tab] of Object.entries(tabs ?? {})) {
        if (!TAB_NAME.test(name)) {
            warnOrThrow(`[extensions] Invalid custom tab "${name}": tab names are PascalCase and end in "Tab".`);
            continue;
        }
        if (!tab || !validRoutes[tab.initialRoute]) {
            warnOrThrow(`[extensions] Custom tab "${name}" opens "${tab?.initialRoute}", which isn't a custom route.`);
            continue;
        }
        if (!tab.icon) {
            warnOrThrow(`[extensions] Custom tab "${name}" has no icon.`);
            continue;
        }
        validTabs[name] = tab;
    }
    return { routes: validRoutes, tabs: validTabs };
}

const RouteLoadError = ({ name }: { name: string }) => {
    const { t } = useLanguage();
    return (
        <YStack flex={1} bg='$background' alignItems='center' justifyContent='center' padding='$6' testID={`custom-route-error-${name}`}>
            <Text color='$textPrimary' textAlign='center' accessibilityRole='alert'>
                {t('ScreenSlot.loadError')}
            </Text>
        </YStack>
    );
};

const routeComponents = new Map<string, React.ComponentType<any>>();

/** A stable component per custom route that loads the screen and contains its failures. */
function routeComponent(name: string, route: CustomRoute): React.ComponentType<any> {
    const existing = routeComponents.get(name);
    if (existing) return existing;
    const Loadable: LoadableComponent = createLoadable(route.load as any, `route:${name}`);
    const CustomRouteScreen = (props: any) => (
        <ScreenErrorBoundary onError={(error) => console.error(`[extensions] Custom route "${name}" failed.`, error)} fallback={() => <RouteLoadError name={name} />}>
            <Suspense fallback={<ScreenLoading />}>
                <Loadable {...props} />
            </Suspense>
        </ScreenErrorBoundary>
    );
    CustomRouteScreen.displayName = `CustomRoute(${name})`;
    routeComponents.set(name, CustomRouteScreen);
    return CustomRouteScreen;
}

/**
 * Adds a build's custom routes to a stack's screens. Core routes win over a custom route
 * with the same name (with a warning): replace core screens with screen overrides instead.
 * `withLinking` declares the routes' paths on this stack only, so each URL resolves once;
 * a tab's own route declares its path on the tab's stack instead.
 */
export function withCustomRoutes<S extends Record<string, any>>(
    screens: S,
    routes: CustomRoutes,
    edition: Edition,
    { withLinking = false, tabs = {} }: { withLinking?: boolean; tabs?: CustomTabs } = {}
): S {
    const tabRoutes = new Set(forEdition(tabs, edition).map(([, tab]) => tab.initialRoute));
    const added: Record<string, any> = {};
    for (const [name, route] of forEdition(routes, edition)) {
        if (name in screens) {
            console.warn(`[extensions] Custom route "${name}" has the same name as a core route and was skipped. Use a screen override to replace a core screen.`);
            continue;
        }
        added[name] = {
            screen: routeComponent(name, route),
            linking: withLinking && route.path && !tabRoutes.has(name) ? { path: route.path } : undefined,
            options: { headerShown: false, ...(route.presentation === 'modal' ? { presentation: 'modal' } : {}) },
        };
    }
    return { ...added, ...screens };
}

/** The custom tabs for an edition, in insertion order. */
export const tabsFor = (tabs: CustomTabs, edition: Edition) => forEdition(tabs, edition);

/**
 * Builds the stack behind a custom tab: the tab's own route first, then every custom
 * route and the edition's shared screens (product, cart, checkout, …) so the tab can
 * open them without switching tabs.
 */
export function createCustomTabStack(name: string, tab: CustomTab, routes: CustomRoutes, edition: Edition, sharedScreens: Record<string, any>) {
    const screens = withCustomRoutes(sharedScreens, routes, edition);
    const initial = routes[tab.initialRoute];
    return createNativeStackNavigator({
        initialRouteName: tab.initialRoute,
        screens: {
            ...screens,
            [tab.initialRoute]: {
                screen: routeComponent(tab.initialRoute, initial),
                linking: initial.path ? { path: initial.path } : undefined,
                options: { headerShown: false },
            },
        },
    } as any);
}

/** Tab bar label for a custom tab: its translation key, a per-locale label, or a plain label. */
export function useCustomTabLabel(tab: CustomTab, fallback: string): string {
    const { t, locale } = useLanguage();
    if (tab.labelKey) return t(tab.labelKey);
    if (typeof tab.label === 'string') return tab.label;
    if (tab.label && typeof tab.label === 'object') return tab.label[locale] ?? tab.label.en ?? Object.values(tab.label)[0] ?? fallback;
    return fallback;
}

/** A custom tab's icon. */
export function CustomTabIcon({ tab, color, focused = false, size = 20 }: { tab: CustomTab; color: string; focused?: boolean; size?: number }) {
    if (typeof tab.icon === 'function') return <>{tab.icon({ color, size, focused })}</>;
    return <FontAwesomeIcon icon={tab.icon} size={size} color={color} />;
}

/**
 * Orders tabs: names listed in `configured` keep that order (custom tabs can be listed
 * too); custom tabs that aren't listed go at their `position`, or just before the cart.
 */
export function orderTabs(configured: string[], custom: Array<[string, CustomTab]>, cartTab: string): string[] {
    const order = configured.filter(Boolean);
    for (const [name, tab] of custom) {
        if (order.includes(name)) continue;
        const cartIndex = order.indexOf(cartTab);
        const index = typeof tab.position === 'number' ? Math.max(0, Math.min(order.length, Math.floor(tab.position))) : cartIndex >= 0 ? cartIndex : order.length;
        order.splice(index, 0, name);
    }
    return order;
}
