import type { ScreenRegistryDefinition } from './types';

/**
 * Default implementations for every overridable screen.
 *
 * Screens are loaded lazily so navigators never import screen modules
 * directly. On web each screen becomes its own chunk. On native, release builds
 * hold every screen in the one bundle (evaluated on first use); in development
 * metro.config.js asks Metro for the whole app up front for the same effect.
 */
export const defaultScreens: ScreenRegistryDefinition = {
    // A single store's home is the store page shared with the Network edition.
    'store.home': { load: () => import('../../screens/network/NetworkStoreScreen') },
    'store.catalog': { load: () => import('../../screens/StoreCatalogScreen') },
    'store.search': { load: () => import('../../screens/StoreSearchScreen') },
    'store.map': { load: () => import('../../screens/StoreMapScreen') },
    'store.info': { load: () => import('../../screens/StoreInfoScreen') },
    // A category opens as its section on the store page.
    'catalog.category': { load: () => import('../../screens/StoreCategoryJumpScreen') },
    'catalog.index': { load: () => import('../../screens/foodtrucks/TruckMenuScreen') },
    'catalog.foodTruckCategory': { load: () => import('../../screens/foodtrucks/TruckMenuScreen') },
    'foodTrucks.home': { load: () => import('../../screens/foodtrucks/FoodTrucksScreen') },
    'foodTrucks.search': { load: () => import('../../screens/foodtrucks/FoodTruckSearchScreen') },
    'foodTrucks.menu': { load: () => import('../../screens/foodtrucks/TruckMenuScreen') },
    // One product screen for both editions (the Network one; it hides "Sold by" in a single store's app).
    'product.detail': { load: () => import('../../screens/network/NetworkProductScreen') },
    cart: { load: () => import('../../screens/CartScreen') },
    'cart.item': { load: () => import('../../screens/CartItemScreen') },
    checkout: { load: () => import('../../screens/CheckoutScreen') },
    'order.detail': { load: () => import('../../screens/OrderScreen') },
    'order.receipt': { load: () => import('../../screens/orders/ReceiptScreen') },
    'order.history': { load: () => import('../../screens/orders/OrderHistoryScreen') },
    'account.profile': { load: () => import('../../screens/account/AccountHomeScreen') },
    // Edit profile: the person's details; settings stay on the account home.
    'account.details': { load: () => import('../../screens/account/EditProfileScreen') },
    'auth.login': { load: () => import('../../screens/auth/SignInScreen') },
    'auth.createAccount': { load: () => import('../../screens/auth/CreateAccountScreen') },
    'network.home': { load: () => import('../../screens/network/NetworkHomeScreen') },
    'network.directory': { load: () => import('../../screens/network/NetworkDirectoryScreen') },
    'network.search': { load: () => import('../../screens/network/NetworkSearchScreen') },
    'network.map': { load: () => import('../../screens/network/NetworkMapScreen') },
    'network.store': { load: () => import('../../screens/network/NetworkStoreScreen') },
    'network.product': { load: () => import('../../screens/network/NetworkProductScreen') },
    'reviews.list': { load: () => import('../../screens/reviews/StoreReviewsScreen') },
    'reviews.write': { load: () => import('../../screens/reviews/WriteReviewScreen') },
    'order.chat': { load: () => import('../../screens/chat/OrderChatScreen') },
    'notifications.inbox': { load: () => import('../../screens/notifications/NotificationsScreen') },
    'notifications.settings': { load: () => import('../../screens/notifications/NotificationSettingsScreen') },
    'offers.list': { load: () => import('../../screens/offers/OffersScreen') },
    'offers.detail': { load: () => import('../../screens/offers/OfferDetailScreen') },
};
