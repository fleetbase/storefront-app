import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHome, faMagnifyingGlass, faMap, faShoppingCart, faUser, faTruck } from '@fortawesome/free-solid-svg-icons';
import { Text, XStack } from 'tamagui';
import { storefrontConfig, get, config, toArray } from '../utils';
import { configCase, uppercase } from '../utils/format';
import { useIsNotAuthenticated, useIsAuthenticated } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { StoreHome, StoreSearch, StoreMap, StoreCategory, StoreCatalog, StoreInfo } from './stacks/StoreStack';
import { PortalHost } from '@gorhom/portal';
import LocationStack from './stacks/LocationStack';
import CheckoutStack from './stacks/CheckoutStack';
import OrderStack, { OrderModal } from './stacks/OrderStack';
import CartStack from './stacks/CartStack';
import SignInScreen from '../screens/auth/SignInScreen';
import { CreateAccountVerifyScreen, DeleteAccountVerifyScreen, PhoneVerifyScreen, SignInVerifyScreen } from '../screens/auth/VerifyCodeScreen';
import DeleteAccountScreen from '../screens/DeleteAccountScreen';
import AddPhoneScreen from '../screens/auth/AddPhoneScreen';
import StripeCustomerScreen from '../screens/StripeCustomerScreen';
import EditAccountPropertyScreen from '../screens/EditAccountPropertyScreen';
import CartButton from '../components/CartButton';
import LocationPicker from '../components/LocationPicker';
import useCart from '../hooks/use-cart';
import StoreLayout from '../layouts/StoreLayout';
import { translate } from '../utils/localize';
import { screenSlot } from '../extensions';
import { customNavigation } from '../extensions/build-navigation';
import { CustomTabIcon, createCustomTabStack, orderTabs, tabsFor, useCustomTabLabel, withCustomRoutes } from '../extensions/navigation';
import { TabBar } from '../ui';
import { totalCartQuantity } from '../network/network-runtime';

const importedIconsMap = {
    faHome,
    faMagnifyingGlass,
    faMap,
    faShoppingCart,
    faUser,
    faTruck,
};

function getTabConfig(name, key, defaultValue = null) {
    const tabs = storefrontConfig('tabs');
    const tab = tabs.find(({ name: tabName }) => name === tabName);
    if (tab) {
        return get(tab, key, defaultValue);
    }

    return defaultValue;
}

const FOOD_TRUCKS_HOME = storefrontConfig('homeScreen') === 'foodTrucks';

const CUSTOM_TABS = tabsFor(customNavigation.tabs, 'store');

// The configured tabs plus the build's custom tabs. When the food trucks map is the home
// screen it takes over the Home tab (so every "go home" lands on it), and the separate
// Trucks and Map tabs are dropped: the trucks map already shows the store and its trucks.
function homeTabs(): string[] {
    const tabs = orderTabs(toArray(storefrontConfig('storeNavigator.tabs')), CUSTOM_TABS, 'StoreCartTab');
    if (!FOOD_TRUCKS_HOME) return tabs;
    return ['StoreHomeTab', ...tabs.filter((tab) => !['StoreHomeTab', 'StoreFoodTruckTab', 'StoreMapTab'].includes(tab))];
}

function initialTab(): string | undefined {
    const tabs = homeTabs();
    if (FOOD_TRUCKS_HOME) return 'StoreHomeTab';
    const custom = CUSTOM_TABS.find(([, tab]) => tab.initial);
    if (custom) return custom[0];
    const configured = toArray(storefrontConfig('storeNavigator.defaultTab'))[0];
    return tabs.includes(configured) ? configured : tabs[0];
}

function createTabScreens(optionsCallbacks = {}) {
    const tabs = homeTabs();
    const screens = {
        StoreHomeTab: {
            screen: StoreHomeTab,
            options: () => {
                const { t, locale } = useLanguage();
                return {
                    tabBarLabel: FOOD_TRUCKS_HOME ? config(`STORE_FOOD_TRUCK_TAB_LABEL_${uppercase(locale)}`, t('tabs.Trucks')) : config(`STORE_HOME_TAB_LABEL_${uppercase(locale)}`, t('tabs.Home')),
                };
            },
        },
        StoreSearchTab: {
            screen: StoreSearchTab,
            options: () => {
                const { t, locale } = useLanguage();
                return {
                    tabBarLabel: config(`STORE_SEARCH_TAB_LABEL_${uppercase(locale)}`, t('tabs.Search')),
                };
            },
        },
        StoreMapTab: {
            screen: StoreMapTab,
            options: () => {
                const { t, locale } = useLanguage();
                return {
                    tabBarLabel: config(`STORE_MAP_TAB_LABEL_${uppercase(locale)}`, t('tabs.Map')),
                };
            },
        },
        StoreCartTab: {
            screen: StoreCartTab,
            options: () => {
                const { t, locale } = useLanguage();
                return {
                    tabBarLabel: config(`STORE_CART_TAB_LABEL_${uppercase(locale)}`, t('tabs.Cart')),
                };
            },
        },
        StoreProfileTab: {
            screen: StoreProfileTab,
            options: () => {
                const { t, locale } = useLanguage();
                return {
                    tabBarLabel: config(`STORE_PROFILE_TAB_LABEL_${uppercase(locale)}`, t('tabs.Profile')),
                };
            },
        },
        StoreFoodTruckTab: {
            screen: StoreFoodTruckTab,
            options: () => {
                const { t, locale } = useLanguage();
                return {
                    tabBarLabel: config(`STORE_FOOD_TRUCK_TAB_LABEL_${uppercase(locale)}`, t('tabs.Trucks')),
                };
            },
        },
    };

    for (const [name, tab] of CUSTOM_TABS) {
        screens[name] = {
            screen: createCustomTabStack(name, tab, customNavigation.routes, 'store', {
                Product: { screen: screenSlot('product.detail'), options: { presentation: 'modal', headerShown: false } },
                Offer: { screen: screenSlot('offers.detail'), options: { headerShown: false } },
                ...LocationStack,
                ...ModalScreens,
            }),
            options: () => ({ tabBarLabel: useCustomTabLabel(tab, name) }),
        };
    }

    const screenTabs = {};
    for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        // A listed tab that isn't registered (e.g. a custom tab missing from the extensions) is skipped.
        if (tab && screens[tab]) {
            screenTabs[tab] = screens[tab];
        }
    }

    return screenTabs;
}

function getDefaultTabIcon(routeName) {
    // Check if able to load from config/env setting first
    const routeIconConfig = config(`${configCase(routeName)}_ICON`);
    if (routeIconConfig && importedIconsMap[routeIconConfig]) {
        return importedIconsMap[routeIconConfig];
    }

    let icon;
    switch (routeName) {
        case 'StoreHomeTab':
            icon = FOOD_TRUCKS_HOME ? faTruck : faHome;
            break;
        case 'StoreSearchTab':
            icon = faMagnifyingGlass;
            break;
        case 'StoreMapTab':
            icon = faMap;
            break;
        case 'StoreCartTab':
            icon = faShoppingCart;
            break;
        case 'StoreProfileTab':
            icon = faUser;
            break;
        case 'StoreFoodTruckTab':
            icon = faTruck;
            break;
    }

    return icon;
}

export const ModalScreens = {
    ProductModal: {
        screen: screenSlot('product.detail'),
        options: {
            presentation: 'modal',
            headerShown: false,
        },
    },
    OrderModal,
};

export const StoreFoodTruckTab = createNativeStackNavigator({
    initialRouteName: 'FoodTruckHome',
    screens: withCustomRoutes(
        {
            FoodTruckHome: {
                screen: screenSlot('foodTrucks.home'),
                options: {
                    headerShown: false,
                },
            },
            FoodTruckSearch: { screen: screenSlot('foodTrucks.search'), options: { headerShown: false, animation: 'fade' } },
            TruckMenu: { screen: screenSlot('foodTrucks.menu'), options: { headerShown: false } },
            Offer: { screen: screenSlot('offers.detail'), options: { headerShown: false } },
            Offers: { screen: screenSlot('offers.list'), options: { headerShown: false } },
            // The store page and what it links to, opened from the trucks map and search.
            StoreHome,
            StoreCategory,
            StoreCatalog,
            StoreInfo,
            StoreReviews: { screen: screenSlot('reviews.list'), options: { headerShown: false } },
            WriteReview: { screen: screenSlot('reviews.write'), options: { presentation: 'modal', headerShown: false } },
            Notifications: { screen: screenSlot('notifications.inbox'), options: { headerShown: false } },
            NotificationSettings: { screen: screenSlot('notifications.settings'), options: { headerShown: false } },
            Catalog: {
                screen: screenSlot('catalog.index'),
                options: {
                    presentation: 'modal',
                    headerShown: false,
                },
            },
            Category: {
                screen: screenSlot('catalog.foodTruckCategory'),
                options: {
                    presentation: 'modal',
                    headerShown: false,
                },
            },
            Product: {
                screen: screenSlot('product.detail'),
                options: {
                    presentation: 'modal',
                    headerShown: false,
                },
            },
            ...CartStack,
            ...CheckoutStack,
            ...LocationStack,
            ...OrderStack,
            ...ModalScreens,
        },
        customNavigation.routes,
        'store'
    ),
});

// With the food trucks home, this tab opens on the trucks map and the store page is pushed from it.
const foodTruckHomeScreens = FOOD_TRUCKS_HOME
    ? {
          FoodTruckHome: { screen: screenSlot('foodTrucks.home'), options: { headerShown: false } },
          FoodTruckSearch: { screen: screenSlot('foodTrucks.search'), options: { headerShown: false, animation: 'fade' } },
          TruckMenu: { screen: screenSlot('foodTrucks.menu'), options: { headerShown: false } },
      }
    : {};

export const StoreHomeTab = createNativeStackNavigator({
    initialRouteName: FOOD_TRUCKS_HOME ? 'FoodTruckHome' : 'StoreHome',
    screens: withCustomRoutes(
        {
            ...foodTruckHomeScreens,
            StoreHome,
            StoreCategory,
            StoreCatalog,
            StoreInfo,
            Product: {
                screen: screenSlot('product.detail'),
                options: {
                    presentation: 'modal',
                    headerShown: false,
                },
            },
            StoreReviews: { screen: screenSlot('reviews.list'), options: { headerShown: false } },
            WriteReview: { screen: screenSlot('reviews.write'), options: { presentation: 'modal', headerShown: false } },
            Offers: { screen: screenSlot('offers.list'), options: { headerShown: false } },
            Notifications: { screen: screenSlot('notifications.inbox'), options: { headerShown: false } },
            NotificationSettings: { screen: screenSlot('notifications.settings'), options: { headerShown: false } },
            Offer: { screen: screenSlot('offers.detail'), options: { headerShown: false } },
            ...LocationStack,
            ...ModalScreens,
        },
        customNavigation.routes,
        'store',
        { withLinking: true, tabs: customNavigation.tabs }
    ),
});

export const StoreSearchTab = createNativeStackNavigator({
    initialRouteName: 'StoreSearch',
    screens: withCustomRoutes(
        {
            StoreSearch,
            Product: {
                screen: screenSlot('product.detail'),
                options: {
                    presentation: 'modal',
                    headerShown: false,
                },
            },
            ...ModalScreens,
        },
        customNavigation.routes,
        'store'
    ),
});

export const StoreMapTab = createNativeStackNavigator({
    initialRouteName: 'StoreMap',
    screens: withCustomRoutes(
        {
            StoreMap,
            StoreInfo,
            StoreReviews: { screen: screenSlot('reviews.list'), options: { headerShown: false } },
            WriteReview: { screen: screenSlot('reviews.write'), options: { presentation: 'modal', headerShown: false } },
        },
        customNavigation.routes,
        'store'
    ),
});

export const StoreCartTab = createNativeStackNavigator({
    initialRouteName: 'Cart',
    screens: withCustomRoutes(
        {
            ...CartStack,
            ...OrderStack,
            ...CheckoutStack,
            ...ModalScreens,
        },
        customNavigation.routes,
        'store'
    ),
});

export const StoreProfileTab = createNativeStackNavigator({
    groups: {
        // Group 1: All authenticated screens (6 screens → 1 hook call)
        Authenticated: {
            if: useIsAuthenticated,
            screens: {
                Profile: {
                    screen: screenSlot('account.profile'),
                    options: {
                        headerShown: false,
                    },
                },
                Account: {
                    screen: screenSlot('account.details'),
                    options: { headerShown: false },
                },
                EditAccountProperty: {
                    screen: EditAccountPropertyScreen,
                    options: ({ route, navigation }) => {
                        return {
                            headerShown: false,
                        };
                    },
                },
                DeleteAccount: {
                    screen: DeleteAccountScreen,
                    options: ({ route, navigation }) => {
                        return {
                            headerShown: false,
                        };
                    },
                },
                DeleteAccountVerify: {
                    screen: DeleteAccountVerifyScreen,
                    options: ({ route, navigation }) => {
                        return {
                            headerShown: false,
                        };
                    },
                },
                StripeCustomer: {
                    screen: StripeCustomerScreen,
                    options: {
                        presentation: 'transparentModal',
                        headerShown: false,
                    },
                },
                AddPhone: {
                    screen: AddPhoneScreen,
                    options: {
                        headerShown: false,
                    },
                },
                VerifyPhone: {
                    screen: PhoneVerifyScreen,
                    options: {
                        headerShown: false,
                    },
                },
            },
        },
        // Group 2: All unauthenticated screens (5 screens → 1 hook call)
        Unauthenticated: {
            if: useIsNotAuthenticated,
            screens: {
                Login: {
                    screen: screenSlot('auth.login'),
                    options: {
                        headerShown: false,
                    },
                },
                PhoneLogin: {
                    screen: SignInScreen,
                    options: {
                        headerShown: false,
                        gestureEnabled: false,
                    },
                },
                PhoneLoginVerify: {
                    screen: SignInVerifyScreen,
                    options: {
                        headerShown: false,
                        gestureEnabled: false,
                    },
                },
                CreateAccount: {
                    screen: screenSlot('auth.createAccount'),
                    options: {
                        headerShown: false,
                    },
                },
                CreateAccountVerify: {
                    screen: CreateAccountVerifyScreen,
                    options: {
                        headerShown: false,
                    },
                },
            },
        },
    },
    screens: withCustomRoutes(
        {
            ...OrderStack,
            ...LocationStack,
            ...ModalScreens,
        },
        customNavigation.routes,
        'store'
    ),
});

/** A tab's icon; the cart's carries a badge with the number of items in it. */
const StoreTabIcon = ({ routeName, color, focused }: { routeName: string; color: string; focused?: boolean }) => {
    const [cart] = useCart();
    const custom = customNavigation.tabs[routeName];
    if (custom) return <CustomTabIcon tab={custom} color={color} focused={focused} />;
    const count = routeName === 'StoreCartTab' ? totalCartQuantity(cart?.contents?.().map((item: any) => item.serialize?.() || item) || []) : 0;
    return (
        <XStack position='relative'>
            <FontAwesomeIcon icon={getDefaultTabIcon(routeName)} size={20} color={color} />
            {count > 0 && (
                <Text
                    position='absolute'
                    top={-10}
                    right={-12}
                    minWidth={18}
                    height={18}
                    paddingHorizontal={4}
                    borderRadius={9}
                    backgroundColor='$error'
                    color='white'
                    textAlign='center'
                    fontSize={11}
                    lineHeight={18}
                    fontWeight='700'
                >
                    {count > 99 ? '99+' : count}
                </Text>
            )}
        </XStack>
    );
};

// The same tab bar as the Network edition: theme roles, brand color for the active tab.
// Which tabs show, their order and labels stay configurable (storeNavigator.tabs, *_TAB_LABEL_*).
const StoreNavigator = createBottomTabNavigator({
    layout: StoreLayout,
    initialRouteName: initialTab(),
    tabBar: (props: any) => <TabBar {...props} />,
    screenOptions: ({ route }: any) => ({
        headerShown: false,
        tabBarIcon: ({ color, focused }: any) => <StoreTabIcon routeName={route.name} color={color} focused={focused} />,
    }),
    screens: createTabScreens(),
});

export default StoreNavigator;
