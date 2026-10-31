// The path functions are React Navigation's own (in core); native's index pulls in react-native.
jest.mock('@react-navigation/native', () => {
    const core = jest.requireActual('@react-navigation/core');
    return { getPathFromState: core.getPathFromState, getStateFromPath: core.getStateFromPath };
});

import { appPath, basePath, createWebLinking, pathForState, resetLinking, routeForPath, titleKeyForRoute, withInitialLink } from '../../src/navigation/web-linking';

const store = { edition: 'store' as const, rootParams: { ownerId: 'store_1' }, homeRoute: 'StoreHome' };
const network = { edition: 'network' as const, rootParams: { ownerId: 'network_1' }, homeRoute: 'NetworkHome' };

const tabs = (tab: string, routes: any[], extra: any[] = []) => ({
    type: 'stack',
    index: 0,
    routes: [{ name: 'StoreNavigator', state: { type: 'tab', index: 0, routes: [{ name: tab, state: { type: 'stack', index: routes.length - 1, routes } }, ...extra] } }],
});

describe('basePath', () => {
    test('is empty at the root', () => {
        expect(basePath('https://joes.apphelm.io/')).toBe('');
        expect(basePath(undefined)).toBe('');
    });

    test("is the preview's prefix, without the trailing slash", () => {
        expect(basePath('https://apphelm.fleetbase.io/p/abc123/')).toBe('/p/abc123');
    });
});

describe('appPath', () => {
    test('strips the base, slashes and the query', () => {
        expect(appPath('/p/abc/products/prod_1?x=1', '/p/abc')).toEqual({ path: 'products/prod_1', query: { x: '1' } });
        expect(appPath('/p/abc/', '/p/abc')).toEqual({ path: '', query: {} });
        expect(appPath('/cart/', '')).toEqual({ path: 'cart', query: {} });
    });
});

describe('routeForPath', () => {
    test('opens a product over the store page', () => {
        expect(routeForPath('products/prod_1', {}, store)).toEqual({
            name: 'StoreNavigator',
            params: { ownerId: 'store_1' },
            state: { routes: [{ name: 'StoreHomeTab', state: { routes: [{ name: 'StoreHome' }, { name: 'Product', params: { productId: 'prod_1' } }] } }] },
        });
    });

    test("opens a network product in its store's path", () => {
        const route: any = routeForPath('stores/store_9/products/prod_1', {}, network);
        expect(route.state.routes[0]).toEqual({ name: 'NetworkHomeTab', state: { routes: [{ name: 'NetworkHome' }, { name: 'Product', params: { storeId: 'store_9', productId: 'prod_1' } }] } });
    });

    test('opens an order on the account tab, over the order history', () => {
        const route: any = routeForPath('orders/order_1', {}, store);
        expect(route.state.routes[0]).toEqual({
            name: 'StoreProfileTab',
            state: { routes: [{ name: 'Profile' }, { name: 'OrderHistory' }, { name: 'Order', params: { orderId: 'order_1' } }] },
        });
    });

    test("passes Stripe's return params to the card checkout", () => {
        const route: any = routeForPath('checkout/card', { payment_intent: 'pi_1', payment_intent_client_secret: 'pi_1_secret' }, store);
        expect(route.state.routes[0].state.routes[1]).toEqual({ name: 'StripeCheckout', params: { payment_intent: 'pi_1', payment_intent_client_secret: 'pi_1_secret' } });
    });

    test('opens tabs by their path', () => {
        expect((routeForPath('cart', {}, store) as any).state.routes[0].name).toBe('StoreCartTab');
        expect((routeForPath('cart', {}, network) as any).state.routes[0].name).toBe('NetworkCartTab');
        expect((routeForPath('search', {}, store) as any).state.routes[0]).toEqual({ name: 'StoreSearchTab' });
        expect(routeForPath('', {}, store)).toEqual({ name: 'StoreNavigator', params: { ownerId: 'store_1' } });
    });

    test('maps a category to its section of the store page', () => {
        expect((routeForPath('categories/cat_1', {}, store) as any).state.routes[0].state.routes).toEqual([{ name: 'StoreHome', params: { categoryId: 'cat_1' } }]);
    });

    test("falls back to the navigators' declared paths for the edition", () => {
        const config = { screens: { NetworkNavigator: { screens: { NetworkHomeTab: { screens: { NetworkStore: 'stores/:storeId' } } } } } };
        expect((routeForPath('stores/store_9', {}, { ...network, config }) as any).state.routes[0]).toMatchObject({ name: 'NetworkHomeTab', state: { routes: [{ name: 'NetworkStore', params: { storeId: 'store_9' } }] } });
    });

    test('is null for an unknown path', () => {
        expect(routeForPath('nope/really', {}, store)).toBeNull();
    });
});

describe('pathForState', () => {
    test("names the product from the screen's product", () => {
        expect(pathForState(tabs('StoreHomeTab', [{ name: 'StoreHome' }, { name: 'Product', params: { product: { id: 'prod_1', name: 'Tea' } } }]), store)).toBe('products/prod_1');
    });

    test('a product opened from another tab has the same path', () => {
        expect(pathForState(tabs('StoreSearchTab', [{ name: 'StoreSearch' }, { name: 'ProductModal', params: { productId: 'prod_2' } }]), store)).toBe('products/prod_2');
    });

    test('an order placed from the cart is an order path', () => {
        expect(pathForState(tabs('StoreCartTab', [{ name: 'Cart' }, { name: 'Order', params: { order: { id: 'order_1' }, justPlaced: true } }]), store)).toBe('orders/order_1');
    });

    test('a screen without a path keeps the page under it', () => {
        expect(pathForState(tabs('StoreCartTab', [{ name: 'Cart' }, { name: 'CartItem', params: { cartItem: {} } }]), store)).toBe('cart');
        expect(pathForState(tabs('StoreProfileTab', [{ name: 'Profile' }, { name: 'EditAccountProperty' }]), store)).toBe('account');
    });

    test('a tab at its first screen is the tab path, home is the root', () => {
        expect(pathForState(tabs('StoreSearchTab', [{ name: 'StoreSearch' }]), store)).toBe('search');
        expect(pathForState(tabs('StoreHomeTab', [{ name: 'StoreHome' }]), store)).toBe('');
    });

    test('only the focused tab counts', () => {
        const state = tabs('StoreHomeTab', [{ name: 'StoreHome' }], [{ name: 'StoreCartTab', state: { type: 'stack', index: 0, routes: [{ name: 'Cart' }] } }]);
        expect(pathForState(state, store)).toBe('');
    });

    test('a root modal over the store', () => {
        const state = { type: 'stack', index: 1, routes: [{ name: 'StoreNavigator' }, { name: 'OrderModal', params: { orderId: 'order_7' } }] };
        expect(pathForState(state, store)).toBe('orders/order_7');
    });
});

describe('titleKeyForRoute', () => {
    test('has titles for pages and tabs', () => {
        expect(titleKeyForRoute('Cart', 'store')).toBe('Cart.title');
        expect(titleKeyForRoute('StoreSearchTab', 'store')).toBe('StoreSearch.title');
        expect(titleKeyForRoute('StoreHome', 'store')).toBeUndefined();
    });
});

describe('createWebLinking', () => {
    afterEach(() => resetLinking('/'));

    test('keeps the address and shows boot until the store is open, then opens the page', () => {
        resetLinking('/products/prod_1');
        const linking = createWebLinking();
        expect(linking.getStateFromPath('/products/prod_1')).toBeUndefined();
        expect(linking.getPathFromState({ index: 0, routes: [{ name: 'Boot' }] })).toBe('/products/prod_1');

        const route: any = withInitialLink({ name: 'StoreNavigator', params: { ownerId: 'store_1' } }, 'StoreHome');
        expect(route.state.routes[0].state.routes[1]).toEqual({ name: 'Product', params: { productId: 'prod_1' } });

        // Back and forward resolve against the open store.
        expect(linking.getStateFromPath('/cart')).toEqual({ routes: [{ name: 'StoreNavigator', params: { ownerId: 'store_1' }, state: { routes: [{ name: 'StoreCartTab', state: { routes: [{ name: 'Cart' }] } }] } }] });
        expect(linking.getPathFromState(tabs('StoreCartTab', [{ name: 'Cart' }, { name: 'Checkout' }]))).toBe('/checkout');
    });

    test("uses the navigators' declared paths for screens it has no path for", () => {
        resetLinking('/');
        const linking = createWebLinking();
        const config = { screens: { NetworkNavigator: { screens: { NetworkHomeTab: { screens: { NetworkCategory: { path: 'categories/:categoryId' } } } } } } };
        withInitialLink({ name: 'NetworkNavigator', params: { ownerId: 'network_1' } }, 'NetworkHome');
        const state = {
            type: 'stack',
            index: 0,
            routes: [
                {
                    name: 'NetworkNavigator',
                    state: { type: 'tab', index: 0, routes: [{ name: 'NetworkHomeTab', state: { type: 'stack', index: 1, routes: [{ name: 'NetworkHome' }, { name: 'NetworkCategory', params: { categoryId: 'cat_1', category: { id: 'cat_1' } } }] } }] },
                },
            ],
        };
        expect(linking.getPathFromState(state, config)).toBe('/categories/cat_1');
    });

    test('an unknown path opens the store home', () => {
        resetLinking('/nope');
        const route = withInitialLink({ name: 'StoreNavigator', params: { ownerId: 'store_1' } }, 'StoreHome');
        expect(route).toEqual({ name: 'StoreNavigator', params: { ownerId: 'store_1' } });
    });
});
