import { faBagShopping, faCompass, faHome, faMagnifyingGlass, faMap, faShop, faShoppingCart, faStore, faTruck, faUser, faUtensils } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { TAB_ICONS } from '../branding/schema';

/** The icons named by `navigation.tabs.<Tab>.icon` in the brand file. */
export const TAB_ICON_MAP: Record<(typeof TAB_ICONS)[number], IconDefinition> = {
    home: faHome,
    store: faStore,
    shop: faShop,
    bag: faBagShopping,
    truck: faTruck,
    utensils: faUtensils,
    map: faMap,
    compass: faCompass,
    search: faMagnifyingGlass,
    cart: faShoppingCart,
    user: faUser,
};
