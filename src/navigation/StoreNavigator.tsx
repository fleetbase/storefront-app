import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHome, faMagnifyingGlass, faMap, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from 'tamagui';
import { getCartCount } from '../utils/cart';
import { useIsNotAuthenticated, useIsAuthenticated } from '../contexts/AuthContext';
import { StoreHome, StoreSearch, StoreMap, StoreCategory } from './stacks/StoreStack';
import { PortalHost } from '@gorhom/portal';
import LocationStack from './stacks/LocationStack';
import CheckoutStack from './stacks/CheckoutStack';
import OrderStack from './stacks/OrderStack';
import CartScreen from '../screens/CartScreen';
import CartItemScreen from '../screens/CartItemScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import PhoneLoginScreen from '../screens/PhoneLoginScreen';
import PhoneLoginVerifyScreen from '../screens/PhoneLoginVerifyScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import AccountScreen from '../screens/AccountScreen';
import StripeCustomerScreen from '../screens/StripeCustomerScreen';
import EditAccountPropertyScreen from '../screens/EditAccountPropertyScreen';
import OrderScreen from '../screens/OrderScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import ProductScreen from '../screens/ProductScreen';
import LocationPicker from '../components/LocationPicker';
import BackButton from '../components/BackButton';
import useCart from '../hooks/use-cart';
import useAppTheme from '../hooks/use-app-theme';

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
    },
});

const StoreMapTab = createNativeStackNavigator({
    initialRouteName: 'StoreMap',
    screens: {
        StoreMap,
    },
});

const StoreCartTab = createNativeStackNavigator({
    initialRouteName: 'Cart',
    screens: {
        Cart: {
            screen: CartScreen,
            options: {
                headerShown: false,
            },
        },
        CartItem: {
            screen: CartItemScreen,
            options: {
                presentation: 'modal',
                headerShown: false,
            },
        },
        ...OrderStack,
        ...CheckoutStack,
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
                    title: '',
                    headerTitleAlign: 'left',
                    headerTransparent: true,
                    headerShadowVisible: false,
                    headerLeft: () => {
                        return <BackButton onPress={() => navigation.goBack()} />;
                    },
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
    },
});

const StoreNavigator = createBottomTabNavigator({
    initialRouteName: 'StoreHomeTab',
    screenOptions: ({ route, navigation }) => {
        const theme = useTheme();
        const { isDarkMode } = useAppTheme();

        return {
            headerShown: false,
            tabBarBackground: () => <BlurView tint={isDarkMode ? 'dark' : 'light'} intensity={100} style={StyleSheet.absoluteFill} />,
            tabBarInactiveTintColor: theme.secondary.val,
            tabBarActiveTintColor: theme.primary.val,
            tabBarStyle: {
                backgroundColor: theme.background.val,
                borderTopWidth: 1,
                borderTopColor: isDarkMode ? theme.borderColor.val : theme['$gray-600'].val,
            },
            tabBarIcon: ({ focused }) => {
                let icon;
                switch (route.name) {
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
                }

                return <FontAwesomeIcon icon={icon} size={20} color={focused ? theme.primary.val : theme.secondary.val} />;
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
    screens: {
        StoreHomeTab: {
            screen: StoreHomeTab,
            options: {
                tabBarLabel: 'Home',
            },
        },
        StoreSearchTab: {
            screen: StoreSearchTab,
            options: {
                tabBarLabel: 'Search',
            },
        },
        StoreMapTab: {
            screen: StoreMapTab,
            options: {
                tabBarLabel: 'Map',
            },
        },
        StoreCartTab: {
            screen: StoreCartTab,
            options: ({}) => {
                const [cart] = useCart();
                const count = cart ? cart.contents().length : 0;
                return {
                    tabBarLabel: 'Cart',
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
                tabBarLabel: 'Profile',
            },
        },
    },
});

export default StoreNavigator;
