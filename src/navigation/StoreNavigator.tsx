import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHome, faMagnifyingGlass, faMap, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';
import { getTheme } from '../utils';
import { getCartCount } from '../utils/cart';
import { StoreHome, StoreSearch, StoreMap, StoreCategory } from './stacks/StoreStack';
import { PortalHost } from '@gorhom/portal';
import LocationStack from './stacks/LocationStack';
import CartScreen from '../screens/CartScreen';
import CartItemScreen from '../screens/CartItemScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProductScreen from '../screens/ProductScreen';
import LocationPicker from '../components/LocationPicker';
import BackButton from '../components/BackButton';
import useCart from '../hooks/use-cart';

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
    },
});

const StoreProfileTab = createNativeStackNavigator({
    initialRouteName: 'Profile',
    screens: {
        Profile: {
            screen: ProfileScreen,
        },
    },
});

const StoreNavigator = createBottomTabNavigator({
    initialRouteName: 'StoreHomeTab',
    screenOptions: ({ route, navigation }) => {
        return {
            headerShown: false,
            tabBarBackground: () => <BlurView tint='light' intensity={100} style={StyleSheet.absoluteFill} />,
            tabBarInactiveTintColor: getTheme('secondary'),
            tabBarActiveTintColor: getTheme('primary'),
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

                return <FontAwesomeIcon icon={icon} size={20} color={focused ? getTheme('primary') : getTheme('secondary')} />;
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
