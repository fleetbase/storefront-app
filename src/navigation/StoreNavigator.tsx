import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Platform, View, Text } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHome, faMagnifyingGlass, faMap, faShoppingCart, faUser, faTruck } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from 'tamagui';
import { storefrontConfig, get, config, toArray, adjustOpacity } from '../utils';
import { configCase, uppercase } from '../utils/format';
import { useIsNotAuthenticated, useIsAuthenticated } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
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
import DeleteAccountScreen from '../screens/DeleteAccountScreen';
import DeleteAccountVerifyScreen from '../screens/DeleteAccountVerifyScreen';
import AccountScreen from '../screens/AccountScreen';
import StripeCustomerScreen from '../screens/StripeCustomerScreen';
import EditAccountPropertyScreen from '../screens/EditAccountPropertyScreen';
import OrderScreen from '../screens/OrderScreen';
import ProductScreen from '../screens/ProductScreen';
import FoodTruckScreen from '../screens/FoodTruckScreen';
import CatalogScreen from '../screens/CatalogScreen';
import CatalogCategoryScreen from '../screens/CatalogCategoryScreen';
import BackButton from '../components/BackButton';
import CartButton from '../components/CartButton';
import LocationPicker from '../components/LocationPicker';
import useCart from '../hooks/use-cart';
import useAppTheme from '../hooks/use-app-theme';
import StoreLayout from '../layouts/StoreLayout';
import { getTheme } from '../utils';
import { translate } from '../utils/localize';

const isAndroid = Platform.OS === 'android';

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

function createTabScreens(optionsCallbacks = {}) {
    const tabs = toArray(storefrontConfig('storeNavigator.tabs'));
    const screens = {
        StoreHomeTab: {
            screen: StoreHomeTab,
            options: () => {
                const { t, locale } = useLanguage();
                return {
                    tabBarLabel: config(`STORE_HOME_TAB_LABEL_${uppercase(locale)}`, t('tabs.Home')),
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
                const [cart] = useCart();
                const count = cart ? cart.contents().length : 0;
                return {
                    tabBarLabel: config(`STORE_CART_TAB_LABEL_${uppercase(locale)}`, t('tabs.Cart')),
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

export const ModalScreens = {
    ProductModal: {
        screen: ProductScreen,
        options: {
            presentation: 'modal',
            headerShown: false,
        },
    },
    OrderModal,
};

export const StoreFoodTruckTab = createNativeStackNavigator({
    initialRouteName: 'FoodTruckHome',
    screens: {
        FoodTruckHome: {
            screen: FoodTruckScreen,
            options: {
                headerShown: false,
            },
        },
        Catalog: {
            screen: CatalogScreen,
            options: {
                presentation: 'modal',
                headerShown: false,
            },
        },
        Category: {
            screen: CatalogCategoryScreen,
            options: ({ route, navigation }) => {
                return {
                    title: null,
                    headerTransparent: true,
                    headerShadowVisible: true,
                    headerLeft: () => {
                        return (
                            <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                                <BackButton onPress={() => navigation.goBack()} style={{ marginRight: 10 }} />
                                <Text style={{ color: getTheme('textPrimary'), fontSize: 15, fontWeight: 'bold' }}>{route.params.category.name}</Text>
                            </View>
                        );
                    },
                    headerRight: () => {
                        return <CartButton text={translate('CatalogScreen.jumpToCart')} onPress={() => navigation.navigate('CartModal')} iconSize={23} textSize={15} />;
                    },
                };
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

export const StoreHomeTab = createNativeStackNavigator({
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

export const StoreSearchTab = createNativeStackNavigator({
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

export const StoreMapTab = createNativeStackNavigator({
    initialRouteName: 'StoreMap',
    screens: {
        StoreMap,
        StoreInfo,
    },
});

export const StoreCartTab = createNativeStackNavigator({
    initialRouteName: 'Cart',
    screens: {
        ...CartStack,
        ...OrderStack,
        ...CheckoutStack,
        ...ModalScreens,
    },
});

export const StoreProfileTab = createNativeStackNavigator({
    groups: {
        // Group 1: All authenticated screens (6 screens → 1 hook call)
        Authenticated: {
            if: useIsAuthenticated,
            screens: {
                Profile: {
                    screen: ProfileScreen,
                    options: {
                        headerShown: false,
                    },
                },
                Account: {
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
            },
        },
        // Group 2: All unauthenticated screens (5 screens → 1 hook call)
        Unauthenticated: {
            if: useIsNotAuthenticated,
            screens: {
                Login: {
                    screen: LoginScreen,
                    options: {
                        headerShown: false,
                    },
                },
                PhoneLogin: {
                    screen: PhoneLoginScreen,
                    options: {
                        headerShown: false,
                        gestureEnabled: false,
                    },
                },
                PhoneLoginVerify: {
                    screen: PhoneLoginVerifyScreen,
                    options: {
                        headerShown: false,
                        gestureEnabled: false,
                    },
                },
                CreateAccount: {
                    screen: CreateAccountScreen,
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
    screens: {
        ...OrderStack,
        ...LocationStack,
        ...ModalScreens,
    },
});

const StoreNavigator = createBottomTabNavigator({
    layout: StoreLayout,
    screenOptions: ({ route, navigation }) => {
        const { isDarkMode } = useAppTheme();
        const theme = useTheme();
        const background = storefrontConfig('storeNavigator.tabBarBackgroundColor', 'blur');
        const backgroundColor = config('CUSTOM_TAB_BAR_BG_COLOR', background === 'blur' ? (isAndroid ? theme['background'].val : 'transparent') : theme[background].val);
        const borderColor = background === 'blur' ? (isAndroid ? theme['borderColor'].val : 'transparent') : theme[`${background}Border`].val;
        const activeColor = background === 'blur' ? config('CUSTOM_TAB_BAR_ACTIVE_COLOR', theme.primary.val) : theme[`${background}Text`].val;
        const inactiveColor = background === 'blur' ? config('CUSTOM_TAB_BAR_INACTIVE_COLOR', theme.secondary.val) : adjustOpacity(theme[`${background}Text`].val, isDarkMode ? 0.5 : 1);

        const screenOptions = {
            headerShown: false,
            tabBarInactiveTintColor: inactiveColor,
            tabBarActiveTintColor: activeColor,
            tabBarStyle: {
                position: 'absolute',
                backgroundColor,
                borderTopWidth: isAndroid ? 0 : 1,
                borderTopColor: borderColor,
                elevation: isAndroid ? 1 : 0,
            },
            tabBarIcon: ({ focused }) => {
                const icon = getDefaultTabIcon(route.name);

                return <FontAwesomeIcon icon={icon} size={20} color={focused ? activeColor : inactiveColor} />;
            },
            tabBarLabelStyle: ({ focused }) => {
                return {
                    marginTop: isAndroid ? 5 : 15,
                    fontSize: 15,
                    fontWeight: focued ? 600 : 300,
                };
            },
        };

        if (!isAndroid) {
            screenOptions.tabBarBackground = () => {
                if (background === 'blur') {
                    return (
                        <View style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'transparent' }}>
                            <BlurView tint={isDarkMode ? 'dark' : 'xlight'} blurAmount={6} style={StyleSheet.absoluteFill} />
                        </View>
                    );
                }

                return <View style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', backgroundColor, borderColor, borderTopWidth: isAndroid ? 0 : 1, borderWidth: 0 }]} />;
            };
        }

        return screenOptions;
    },
    screens: createTabScreens(),
});

export default StoreNavigator;
