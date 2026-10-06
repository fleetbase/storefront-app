import type { ScreenId } from './screen-ids';

type Serialized = Record<string, any>;

/**
 * Route params each screen accepts. Ids are required where a screen can be
 * deep-linked; serialized objects are optional hints that avoid a refetch.
 */
export type ScreenParamMap = {
    'store.home': { storeId?: string; store?: Serialized } | undefined;
    'store.search': undefined;
    'store.map': undefined;
    'store.info': { store: Serialized; storeLocation?: Serialized };
    'catalog.category': { storeId?: string; categoryId?: string; category?: Serialized };
    'catalog.index': Serialized | undefined;
    'catalog.foodTruckCategory': Serialized | undefined;
    'product.detail': { storeId?: string; productId?: string; product?: Serialized; quantity?: number; [key: string]: any };
    cart: undefined;
    'cart.item': { cartItem?: Serialized; product?: Serialized; [key: string]: any };
    checkout: Serialized | undefined;
    'order.detail': { order: Serialized; [key: string]: any };
    'order.receipt': { order: Serialized; [key: string]: any };
    'order.history': undefined;
    'account.profile': undefined;
    'account.details': undefined;
    'auth.login': { redirectTo?: string; [key: string]: any } | undefined;
    'auth.createAccount': { redirectTo?: string; [key: string]: any } | undefined;
    'network.home': undefined;
    'network.directory': { categoryId?: string; category?: Serialized; tag?: string; tags?: string[]; sort?: string } | undefined;
    'network.search': undefined;
    'network.map': undefined;
    'network.store': { storeId: string; store?: Serialized };
    'network.product': { storeId?: string; productId: string; product?: Serialized; store?: Serialized };
};

// Compile-time guarantee that every ScreenId has a params entry and vice versa.
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export const PARAM_MAP_COVERS_ALL_SCREENS: Exact<keyof ScreenParamMap, ScreenId> = true;
