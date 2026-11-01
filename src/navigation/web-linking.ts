import { getPathFromState as defaultGetPathFromState, getStateFromPath as defaultGetStateFromPath } from '@react-navigation/native';

/**
 * URLs for the web build. Each page a customer can share or reload has a path:
 *
 *   /                                   the store (or the network's home)
 *   /categories/:categoryId             a category of the store page
 *   /products/:productId                a product (network: /stores/:storeId/products/:productId)
 *   /search, /map, /trucks, /offers     tabs
 *   /cart, /checkout, /checkout/card    the cart and checkout (card, qpay, paypal)
 *   /orders, /orders/:orderId           the customer's orders, an order
 *   /account, /account/details          the account
 *   /sign-in, /sign-up
 *
 * The same screen is registered in several tabs (a product opens from any tab), so paths are
 * matched by the focused screen's name here instead of in the navigators. A screen without a
 * path (a sheet, a modal) keeps the URL of the page under it. Paths the navigators declare
 * themselves (the Network edition's, a build's custom routes) still work through React
 * Navigation's own parser.
 *
 * Everything starts at the boot screen, which loads the store first. A deep link waits until
 * boot enters the store (`withInitialLink`) and the URL stays as it was meanwhile.
 *
 * The app may be served under a prefix (the preview's `<base href="/p/<token>/">`); it is read
 * from the page's `<base href>`.
 */

export type Edition = 'store' | 'network';
type Params = Record<string, any>;
type TabKey = 'home' | 'search' | 'map' | 'cart' | 'profile' | 'trucks' | 'offers';
type StackRoute = { name: string; params?: Params };
type NavState = { type?: string; index?: number; routes: { name: string; params?: Params; state?: NavState }[] };

export const ROOT_ROUTES: Record<Edition, string> = { store: 'StoreNavigator', network: 'NetworkNavigator' };

const TABS: Record<Edition, Partial<Record<TabKey, string>>> = {
    store: { home: 'StoreHomeTab', search: 'StoreSearchTab', map: 'StoreMapTab', cart: 'StoreCartTab', profile: 'StoreProfileTab', trucks: 'StoreFoodTruckTab' },
    network: {
        home: 'NetworkHomeTab',
        search: 'NetworkSearchTab',
        map: 'NetworkMapTab',
        cart: 'NetworkCartTab',
        profile: 'NetworkProfileTab',
        trucks: 'NetworkFoodTruckTab',
        offers: 'NetworkOffersTab',
    },
};

const TAB_PATHS: Record<TabKey, string> = { home: '', search: 'search', map: 'map', cart: 'cart', profile: 'account', trucks: 'trucks', offers: 'offers' };

const TAB_TITLES: Record<TabKey, string | undefined> = {
    home: undefined,
    search: 'StoreSearch.title',
    map: 'tabs.Map',
    cart: 'Cart.title',
    profile: 'Account.title',
    trucks: 'Network.tabs.trucks',
    offers: 'Network.tabs.offers',
};

type Entry = {
    path: string;
    /** The screens shown at this path, by route name, in any tab. */
    names: string[];
    editions?: Edition[];
    tab: TabKey;
    /** The path's params from the screen's params, or null when the screen can't be linked. */
    toPath?: (params: Params) => Params | null;
    /** The tab's stack for the path. */
    stack: (params: Params, home: string) => StackRoute[];
    title?: string;
};

const id = (value: any): string | undefined => (typeof value === 'string' || typeof value === 'number' ? String(value) : undefined);

const ENTRIES: Entry[] = [
    {
        path: 'products/:productId',
        names: ['Product', 'ProductModal'],
        editions: ['store'],
        tab: 'home',
        toPath: (p) => (id(p.productId ?? p.product?.id) ? { productId: id(p.productId ?? p.product?.id) } : null),
        stack: (p, home) => [{ name: home }, { name: 'Product', params: p }],
    },
    {
        path: 'stores/:storeId/products/:productId',
        names: ['Product', 'ProductModal'],
        editions: ['network'],
        tab: 'home',
        toPath: (p) => {
            const productId = id(p.productId ?? p.product?.id);
            const storeId = id(p.storeId ?? p.store?.id ?? p.product?.store_id);
            return productId && storeId ? { storeId, productId } : null;
        },
        stack: (p, home) => [{ name: home }, { name: 'Product', params: p }],
    },
    {
        // A category is a section of the store page.
        path: 'categories/:categoryId',
        names: ['StoreHome', 'StoreCategory'],
        editions: ['store'],
        tab: 'home',
        toPath: (p) => (id(p.categoryId ?? p.category?.id) ? { categoryId: id(p.categoryId ?? p.category?.id) } : null),
        stack: (p) => [{ name: 'StoreHome', params: p }],
    },
    { path: 'cart', names: ['Cart', 'CartModal'], tab: 'cart', stack: () => [{ name: 'Cart' }], title: 'Cart.title' },
    { path: 'checkout', names: ['Checkout'], tab: 'cart', stack: (p) => [{ name: 'Cart' }, { name: 'Checkout', params: p }], title: 'Checkout.title' },
    { path: 'checkout/card', names: ['StripeCheckout'], tab: 'cart', stack: (p) => [{ name: 'Cart' }, { name: 'StripeCheckout', params: p }], title: 'Checkout.title' },
    { path: 'checkout/qpay', names: ['QPayCheckout'], tab: 'cart', stack: (p) => [{ name: 'Cart' }, { name: 'QPayCheckout', params: p }], title: 'Checkout.title' },
    { path: 'checkout/paypal', names: ['PaypalCheckout'], tab: 'cart', stack: (p) => [{ name: 'Cart' }, { name: 'PaypalCheckout', params: p }], title: 'Checkout.title' },
    { path: 'orders', names: ['OrderHistory'], tab: 'profile', stack: () => [{ name: 'Profile' }, { name: 'OrderHistory' }], title: 'Orders.title' },
    {
        path: 'orders/:orderId',
        names: ['Order', 'OrderModal'],
        tab: 'profile',
        toPath: (p) => (id(p.orderId ?? p.order?.id) ? { orderId: id(p.orderId ?? p.order?.id) } : null),
        stack: (p) => [{ name: 'Profile' }, { name: 'OrderHistory' }, { name: 'Order', params: p }],
        title: 'common.order',
    },
    { path: 'account', names: ['Profile'], tab: 'profile', stack: () => [{ name: 'Profile' }], title: 'Account.title' },
    { path: 'account/details', names: ['Account'], tab: 'profile', stack: () => [{ name: 'Profile' }, { name: 'Account' }], title: 'Account.title' },
    // The signed-out stack of the profile tab: these routes exist only while signed out, and the
    // stack drops a route that doesn't exist, so a signed-in customer lands on their account.
    { path: 'sign-in', names: ['Login', 'PhoneLogin'], tab: 'profile', stack: () => [{ name: 'Login' }], title: 'Auth.signInTitle' },
    { path: 'sign-up', names: ['CreateAccount'], tab: 'profile', stack: () => [{ name: 'CreateAccount' }], title: 'CreateAccountScreen.createAccount' },
];

const forEdition = (edition: Edition) => ENTRIES.filter((entry) => !entry.editions || entry.editions.includes(edition));

// Paths

/** The page's `<base href>`, if it has one (without one, document.baseURI is the page's own address). */
const baseHref = (): string | undefined => (typeof document !== 'undefined' ? (document.querySelector?.('base[href]') as HTMLBaseElement | null)?.href : undefined);

/** The prefix the app is served under, without a trailing slash: '' or '/p/<token>'. */
export function basePath(baseURI: string | undefined = baseHref()): string {
    if (!baseURI) return '';
    try {
        return new URL(baseURI).pathname.replace(/\/+$/, '');
    } catch {
        return '';
    }
}

/** The path within the app: the location without the base prefix, the leading slash or the query. */
export function appPath(location: string, base: string): { path: string; query: Params } {
    const [pathname, search = ''] = location.split('?');
    let path = pathname;
    if (base && (path === base || path.startsWith(`${base}/`))) path = path.slice(base.length);
    path = path.replace(/^\/+|\/+$/g, '');
    const query: Params = {};
    new URLSearchParams(search).forEach((value, key) => {
        query[key] = value;
    });
    return { path, query };
}

function match(pattern: string, path: string): Params | null {
    const want = pattern.split('/').filter(Boolean);
    const have = path.split('/').filter(Boolean);
    if (want.length !== have.length) return null;
    const params: Params = {};
    for (let i = 0; i < want.length; i++) {
        if (want[i].startsWith(':')) params[want[i].slice(1)] = decodeURIComponent(have[i]);
        else if (want[i] !== have[i]) return null;
    }
    return params;
}

function fill(pattern: string, params: Params): string {
    return pattern
        .split('/')
        .map((part) => (part.startsWith(':') ? encodeURIComponent(params[part.slice(1)]) : part))
        .join('/');
}

// State from a path

export type LinkContext = { edition: Edition; rootParams?: Params; homeRoute: string; config?: any };

/** The root route for an app path, or null when the path isn't known. */
export function routeForPath(path: string, query: Params, context: LinkContext): { name: string; params?: Params; state?: NavState } | null {
    const { edition, rootParams, homeRoute } = context;
    const root = ROOT_ROUTES[edition];
    const tabs = TABS[edition];
    const withRoot = (state?: NavState) => ({ name: root, params: rootParams, ...(state ? { state } : {}) });

    for (const entry of forEdition(edition)) {
        const params = match(entry.path, path);
        if (!params) continue;
        const tab = tabs[entry.tab];
        if (!tab) return null;
        const routes = entry.stack({ ...query, ...params }, homeRoute);
        return withRoot({ routes: [{ name: tab, state: { routes } }] });
    }

    for (const [key, tabPath] of Object.entries(TAB_PATHS) as [TabKey, string][]) {
        const tab = tabs[key];
        if (tab && tabPath === path) return withRoot(path === '' ? undefined : { routes: [{ name: tab }] });
    }

    // Paths the navigators declare (the Network edition's, a build's custom routes), for this edition only.
    const screens = context.config?.screens?.[root];
    if (screens) {
        try {
            const state: any = defaultGetStateFromPath(`/${path}${queryString(query)}`, { screens: { [root]: screens } } as any);
            const route = state?.routes?.[0];
            if (route?.name === root) return withRoot(route.state);
        } catch (error) {
            console.warn('[linking] Could not read the path', path, error);
        }
    }

    return null;
}

const queryString = (query: Params) => {
    const search = new URLSearchParams(query).toString();
    return search ? `?${search}` : '';
};

// Path from a state

/** Primitive params only: objects (a whole product, an order) don't belong in a URL. */
function plainParams(params?: Params): Params | undefined {
    if (!params) return undefined;
    const plain = Object.fromEntries(Object.entries(params).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value)));
    return Object.keys(plain).length ? plain : undefined;
}

function plainState(state: NavState): NavState {
    return { ...state, routes: state.routes.map((route) => ({ ...route, params: plainParams(route.params), state: route.state ? plainState(route.state) : undefined })) };
}

/** Route names the navigators give a path of their own. */
function declaredNames(screens: Record<string, any> | undefined, names = new Set<string>()): Set<string> {
    for (const [name, screen] of Object.entries(screens ?? {})) {
        if (typeof screen === 'string' || typeof screen?.path === 'string') names.add(name);
        if (screen && typeof screen === 'object' && screen.screens) declaredNames(screen.screens, names);
    }
    return names;
}

function entryPath(route: { name: string; params?: Params }, edition: Edition): string | undefined {
    for (const entry of forEdition(edition)) {
        if (!entry.names.includes(route.name)) continue;
        if (!entry.toPath) return entry.path;
        const params = entry.toPath(route.params ?? {});
        if (params) return fill(entry.path, params);
    }
    const tab = (Object.entries(TABS[edition]) as [TabKey, string][]).find(([, name]) => name === route.name);
    if (tab) return TAB_PATHS[tab[0]];
    return undefined;
}

/**
 * The app path of a navigation state: the focused screen's, or the nearest page under it.
 * `undefined` when nothing in the state has a path.
 */
export function pathForState(state: NavState, context: LinkContext): string | undefined {
    const visit = (current: NavState): string | undefined => {
        const index = current.index ?? current.routes.length - 1;
        // In a tab navigator only the focused tab is on screen; in a stack, the screens under it are.
        const candidates = current.type === 'tab' ? [current.routes[index]] : current.routes.slice(0, index + 1).reverse();
        for (const route of candidates) {
            if (!route) continue;
            if (route.state) {
                const nested = visit(route.state);
                if (nested !== undefined) return nested;
            }
            const own = entryPath(route, context.edition);
            if (own !== undefined) return own;
            if (route.name === ROOT_ROUTES[context.edition]) return '';
        }
        return undefined;
    };
    return visit(state);
}

/** The title key for the focused screen, if it has one. */
export function titleKeyForRoute(name: string | undefined, edition: Edition): string | undefined {
    if (!name) return undefined;
    const entry = forEdition(edition).find((candidate) => candidate.names.includes(name));
    if (entry) return entry.title;
    const tab = (Object.entries(TABS[edition]) as [TabKey, string][]).find(([, tabName]) => tabName === name);
    return tab ? TAB_TITLES[tab[0]] : undefined;
}

// The linking options

const initialLocation = typeof window !== 'undefined' && window.location ? window.location.pathname + window.location.search : '/';
let booted: LinkContext | null = null;
let pendingLink: string | null = initialLocation;
// The paths the navigators declare, as React Navigation hands them to the linking functions.
let declaredConfig: any;

/**
 * Boot entered the store: the route to reset to, with the page the URL asked for nested in it.
 * `homeRoute` is the first screen of the home tab. Later paths (back, forward) resolve against
 * this store.
 */
export function withInitialLink(route: { name: string; params?: Params }, homeRoute: string): { name: string; params?: Params; state?: NavState } {
    const edition: Edition = route.name === ROOT_ROUTES.network ? 'network' : 'store';
    booted = { edition, rootParams: route.params, homeRoute };
    const link = pendingLink;
    pendingLink = null;
    if (!link) return route;
    const { path, query } = appPath(link, basePath());
    if (!path) return route;
    return routeForPath(path, query, { ...booted, config: declaredConfig }) ?? route;
}

/** For tests: forget the store and start from `location`. */
export function resetLinking(location: string | null = '/') {
    booted = null;
    pendingLink = location;
}

const focusedLeaf = (state: NavState) => {
    let route: any = state.routes[state.index ?? state.routes.length - 1];
    while (route?.state) route = route.state.routes[route.state.index ?? route.state.routes.length - 1];
    return route as { name: string; params?: Params } | undefined;
};

/** The path the navigators declare for the focused screen, when it has one and it reads back to that screen. */
function declaredPath(state: NavState, context: LinkContext): string | undefined {
    const root = ROOT_ROUTES[context.edition];
    const screens = declaredConfig?.screens?.[root];
    const focused = focusedLeaf(state);
    if (!screens || !focused || !declaredNames(screens.screens).has(focused.name)) return undefined;
    if (forEdition(context.edition).some((entry) => entry.names.includes(focused.name))) return undefined;
    const rootRoute = state.routes.find((route) => route.name === root);
    if (!rootRoute?.state) return undefined;
    const config = { screens: { [root]: screens } } as any;
    try {
        const path = defaultGetPathFromState(plainState({ routes: [{ name: root, state: rootRoute.state }] }) as any, config);
        const readBack: any = defaultGetStateFromPath(path, config);
        return readBack && focusedLeaf(readBack)?.name === focused.name ? path.replace(/^\/+/, '') : undefined;
    } catch {
        return undefined;
    }
}

export function createWebLinking() {
    return {
        prefixes: [] as string[],
        enabled: true as const,
        getStateFromPath(location: string, options?: any) {
            declaredConfig = options ?? declaredConfig;
            // Until boot has loaded the store, the app shows boot; the link is kept for later.
            if (!booted) return undefined;
            const { path, query } = appPath(location, basePath());
            const route = routeForPath(path, query, { ...booted, config: declaredConfig });
            return { routes: [route ?? { name: ROOT_ROUTES[booted.edition], params: booted.rootParams }] } as any;
        },
        getPathFromState(state: any, options?: any) {
            declaredConfig = options ?? declaredConfig;
            const root = state?.routes?.[state.index ?? 0];
            const inStore = root && (root.name === ROOT_ROUTES.store || root.name === ROOT_ROUTES.network);
            // Boot, or the location prompt before the store opens: keep the address that was asked for.
            if (!booted || (!inStore && pendingLink)) {
                return pendingLink ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/');
            }
            const path = declaredPath(state, booted) ?? pathForState(state, booted) ?? '';
            // Home is the base itself, with its slash: the preview serves `/p/<token>/`.
            return `${basePath()}/${path}`;
        },
    };
}
