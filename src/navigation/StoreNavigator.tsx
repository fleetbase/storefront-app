import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Platform, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHome, faMagnifyingGlass, faMap, faShoppingCart, faUser, faTruck } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from 'tamagui';
import { storefrontConfig, get, config, toArray, adjustOpacity } from '../utils';
import { configCase } from '../utils/format';
import { useIsNotAuthenticated, useIsAuthenticated } from '../contexts/AuthContext';
import { StoreHome, StoreSearch, StoreMap, StoreCategory, StoreInfo } from './stacks/StoreStack';
import { PortalHost } from '@gorhom/portal';
import LocationStack from './stacks/LocationStack';
import CheckoutStack from './stacks/CheckoutStack';
import OrderStack, { OrderModal } from './stacks/OrderStack';
import CartStack from './stacks/CartStack';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import PhoneLoginScreen from '../screens/PhoneLoginScreen';
import PhoneLoginVerifyScreen from '../screens/PhoneLoginVerifyScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import CreateAccountVerifyScreen from '../screens/CreateAccountVerifyScreen';
import AccountScreen from '../screens/AccountScreen';
import StripeCustomerScreen from '../screens/StripeCustomerScreen';
import EditAccountPropertyScreen from '../screens/EditAccountPropertyScreen';
import OrderScreen from '../screens/OrderScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import ProductScreen from '../screens/ProductScreen';
import FoodTruckScreen from '../screens/FoodTruckScreen';
import CatalogScreen from '../screens/CatalogScreen';
import BackButton from '../components/BackButton';
import CartButton from '../components/CartButton';
import LocationPicker from '../components/LocationPicker';
import useCart from '../hooks/use-cart';
import useAppTheme from '../hooks/use-app-theme';
import StoreLayout from '../layouts/StoreLayout';

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

function createTabScreens() {
    const tabs = toArray(storefrontConfig('storeNavigator.tabs'));
    const screens = {
        StoreHomeTab: {
            screen: StoreHomeTab,
            options: {
                tabBarLabel: config('STORE_HOME_TAB_LABEL', 'Home'),
            },
        },
        StoreSearchTab: {
            screen: StoreSearchTab,
            options: {
                tabBarLabel: config('STORE_SEARCH_TAB_LABEL', 'Search'),
            },
        },
        StoreMapTab: {
            screen: StoreMapTab,
            options: {
                tabBarLabel: config('STORE_MAP_TAB_LABEL', 'Map'),
            },
        },
        StoreCartTab: {
            screen: StoreCartTab,
            options: () => {
                const [cart] = useCart();
                const count = cart ? cart.contents().length : 0;
                return {
                    tabBarLabel: config('STORE_CART_TAB_LABEL', 'Cart'),
                    tabBarBadge: count,
                    tabBarBadgeStyle: {
                        marginRight: -5,
                        opacity: count ? 1 : 0.5,
                    },
                };
            },
        },
        StoreProfileTab: {
            screen: StoreProfileTab,
            options: {
                tabBarLabel: config('STORE_PROFILE_TAB_LABEL', 'Profile'),
            },
        },
        StoreFoodTruckTab: {
            screen: StoreFoodTruckTab,
            options: {
                tabBarLabel: config('STORE_FOOD_TRUCK_TAB_LABEL', 'Trucks'),
            },
        },
    };

    const screenTabs = {};
    for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        if (tab) {
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
            icon = faHome;
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

const ModalScreens = {
    ProductModal: {
        screen: ProductScreen,
        options: {
            presentation: 'modal',
            headerShown: false,
        },
    },
    OrderModal,
};

const StoreFoodTruckTab = createNativeStackNavigator({
    initialRouteName: 'FoodTruckHome',
    screens: {
        FoodTruckHome: {
            screen: FoodTruckScreen,
            options: {
                title: '',
                headerTransparent: true,
                headerShadowVisible: false,
                gestureEnabled: false,
                headerLeft: () => (
                    <LocationPicker onPressAddNewLocation={({ navigation, params }) => navigation.navigate('AddNewLocation', params)} redirectToAfterAddLocation={'FoodTruckHome'} />
                ),
                headerRight: () => <CartButton onPress={({ navigation }) => navigation.navigate('CartModal')} />,
            },
        },
        Catalog: {
            screen: CatalogScreen,
            options: {
                presentation: 'modal',
                headerShown: false,
            },
        },
        Product: {
            screen: ProductScreen,
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
});

const StoreHomeTab = createNativeStackNavigator({
    initialRouteName: 'StoreHome',
    screens: {
        StoreHome,
        StoreCategory,
        Product: {
            screen: ProductScreen,
            options: {
                presentation: 'modal',
                headerShown: false,
            },
        },
        ...LocationStack,
        ...ModalScreens,
    },
});

const StoreSearchTab = createNativeStackNavigator({
    initialRouteName: 'StoreSearch',
    screens: {
        StoreSearch,
        Product: {
            screen: ProductScreen,
            options: {
                presentation: 'modal',
                headerShown: false,
            },
        },
        ...ModalScreens,
    },
});

const StoreMapTab = createNativeStackNavigator({
    initialRouteName: 'StoreMap',
    screens: {
        StoreMap,
        StoreInfo,
    },
});

const StoreCartTab = createNativeStackNavigator({
    initialRouteName: 'Cart',
    screens: {
        ...CartStack,
        ...OrderStack,
        ...CheckoutStack,
        ...ModalScreens,
    },
});

const StoreProfileTab = createNativeStackNavigator({
    screens: {
        Profile: {
            if: useIsAuthenticated,
            screen: ProfileScreen,
            options: {
                headerShown: false,
            },
        },
        Account: {
            if: useIsAuthenticated,
            screen: AccountScreen,
            options: ({ route, navigation }) => {
                return {
                    title: '',
                    headerTransparent: true,
                    headerShadowVisible: false,
                    headerLeft: () => {
                        return <BackButton onPress={() => navigation.goBack()} />;
                    },
                };
            },
        },
        EditAccountProperty: {
            if: useIsAuthenticated,
            screen: EditAccountPropertyScreen,
            options: ({ route, navigation }) => {
                return {
                    headerShown: false,
                };
            },
        },
        Login: {
            if: useIsNotAuthenticated,
            screen: LoginScreen,
            options: {
                headerShown: false,
            },
        },
        PhoneLogin: {
            if: useIsNotAuthenticated,
            screen: PhoneLoginScreen,
            options: {
                headerShown: false,
                gestureEnabled: false,
            },
        },
        PhoneLoginVerify: {
            if: useIsNotAuthenticated,
            screen: PhoneLoginVerifyScreen,
            options: {
                headerShown: false,
                gestureEnabled: false,
            },
        },
        CreateAccount: {
            if: useIsNotAuthenticated,
            screen: CreateAccountScreen,
            options: {
                headerShown: false,
            },
        },
        CreateAccountVerify: {
            if: useIsNotAuthenticated,
            screen: CreateAccountVerifyScreen,
            options: {
                headerShown: false,
            },
        },
        StripeCustomer: {
            if: useIsAuthenticated,
            screen: StripeCustomerScreen,
            options: {
                presentation: 'transparentModal',
                headerShown: false,
            },
        },
        ...OrderStack,
        ...LocationStack,
        ...ModalScreens,
    },
});

const StoreNavigator = createBottomTabNavigator({
    // initialRouteName: storefrontConfig('storeNavigator.defaultTab', 'StoreHomeTab'),
    layout: StoreLayout,
    screenOptions: ({ route, navigation }) => {
        const { isDarkMode } = useAppTheme();
        const theme = useTheme();
        const background = storefrontConfig('storeNavigator.tabBarBackgroundColor', 'blur');
        const backgroundColor = background === 'blur' ? 'transparent' : theme[background].val;
        const borderColor = background === 'blur' ? 'transparent' : theme[`${background}Border`].val;
        const activeColor = background === 'blur' ? theme.primary.val : theme[`${background}Text`].val;
        const inactiveColor = background === 'blur' ? theme.secondary.val : adjustOpacity(theme[`${background}Text`].val, isDarkMode ? 0.35 : 1);

        return {
            headerShown: false,
            tabBarBackground: () => {
                if (background === 'blur') {
                    return (
                        <View style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'transparent' }}>
                            <BlurView tint={isDarkMode ? 'dark' : 'xlight'} blurAmount={6} style={StyleSheet.absoluteFill} />
                        </View>
                    );
                }

                return <View style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', backgroundColor, borderColor }]} />;
            },
            tabBarInactiveTintColor: inactiveColor,
            tabBarActiveTintColor: activeColor,
            tabBarStyle: {
                position: 'absolute',
                backgroundColor,
                borderTopWidth: 1,
                borderTopColor: borderColor,
                elevation: 0,
            },
            tabBarIcon: ({ focused }) => {
                const icon = getDefaultTabIcon(route.name);

                return <FontAwesomeIcon icon={icon} size={20} color={focused ? activeColor : inactiveColor} />;
            },
            tabBarLabelStyle: ({ focused }) => {
                return {
                    marginTop: 15,
                    fontSize: 15,
                    fontWeight: focued ? 600 : 300,
                };
            },
        };
    },
    screens: createTabScreens(),
});

export default StoreNavigator;
