import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCompass, faMagnifyingGlass, faMap, faShoppingCart, faTruck, faUser } from '@fortawesome/free-solid-svg-icons';
import { Text, XStack } from 'tamagui';
import BackButton from '../components/BackButton';
import StoreLayout from '../layouts/StoreLayout';
import { StoreCartTab, StoreProfileTab } from './StoreNavigator';
import useCart from '../hooks/use-cart';
import { useLanguage } from '../contexts/LanguageContext';
import { totalCartQuantity } from '../network/network-runtime';
import { screenSlot } from '../extensions';
import { TabBar, UIText } from '../ui';
import { storefrontConfig } from '../utils';

// Store, category and product screens are pushed from the Home, Search and Map
// stacks. Deep-link paths are declared only on the Home stack's copies so each
// URL resolves to exactly one route; the other stacks opt out explicitly
// (`linking: undefined`) so no paths are auto-generated for them.
const createSharedNetworkScreens = (withLinking: boolean) => ({
    // The store directory, filtered by a category or tags (from home, search and map).
    NetworkCategory: {
        screen: screenSlot('network.directory'),
        linking: withLinking ? { path: 'categories/:categoryId' } : undefined,
        options: { headerShown: false },
    },
    NetworkStore: {
        screen: screenSlot('network.store'),
        linking: withLinking ? { path: 'stores/:storeId' } : undefined,
        options: { headerShown: false },
    },
    StoreCategory: {
        screen: screenSlot('catalog.category'),
        linking: withLinking ? { path: 'stores/:storeId/categories/:categoryId' } : undefined,
        options: ({ route, navigation }: any) => ({
            title: route.params?.category?.name || '',
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
        }),
    },
    Product: {
        screen: screenSlot('network.product'),
        linking: withLinking ? { path: 'stores/:storeId/products/:productId' } : undefined,
        options: { presentation: 'modal', headerShown: false },
    },
    // StoreInfo needs the full store object in its params, so it is not deep-linkable.
    StoreInfo: { screen: screenSlot('store.info'), linking: undefined, options: { presentation: 'modal', headerShown: false } },
    StoreReviews: { screen: screenSlot('reviews.list'), linking: withLinking ? { path: 'stores/:storeId/reviews' } : undefined, options: { headerShown: false } },
    WriteReview: { screen: screenSlot('reviews.write'), linking: undefined, options: { presentation: 'modal', headerShown: false } },
    Notifications: { screen: screenSlot('notifications.inbox'), linking: withLinking ? { path: 'notifications' } : undefined, options: { headerShown: false } },
    NotificationSettings: { screen: screenSlot('notifications.settings'), linking: undefined, options: { headerShown: false } },
    Offers: { screen: screenSlot('offers.list'), linking: withLinking ? { path: 'offers' } : undefined, options: { headerShown: false } },
    Offer: { screen: screenSlot('offers.detail'), linking: withLinking ? { path: 'offers/:offerId' } : undefined, options: { headerShown: false } },
});

const NetworkHomeStack = createNativeStackNavigator({
    initialRouteName: 'NetworkHome',
    screens: {
        NetworkHome: { screen: screenSlot('network.home'), options: { headerShown: false } },
        ...createSharedNetworkScreens(true),
    },
});

const NetworkSearchStack = createNativeStackNavigator({
    screens: {
        NetworkSearch: { screen: screenSlot('network.search'), linking: { path: 'search' }, options: { headerShown: false } },
        ...createSharedNetworkScreens(false),
    },
});

const NetworkMapStack = createNativeStackNavigator({
    screens: {
        NetworkMap: { screen: screenSlot('network.map'), linking: { path: 'map' }, options: { headerShown: false } },
        ...createSharedNetworkScreens(false),
    },
});

// The food trucks map: member stores' trucks alongside the stores themselves.
const NetworkFoodTruckStack = createNativeStackNavigator({
    screens: {
        FoodTruckHome: { screen: screenSlot('foodTrucks.home'), linking: { path: 'trucks' }, options: { headerShown: false } },
        FoodTruckSearch: { screen: screenSlot('foodTrucks.search'), linking: undefined, options: { headerShown: false, animation: 'fade' } },
        TruckMenu: { screen: screenSlot('foodTrucks.menu'), linking: { path: 'trucks/:foodTruckId' }, options: { headerShown: false } },
        ...createSharedNetworkScreens(false),
    },
});

const FOOD_TRUCKS_HOME = storefrontConfig('homeScreen') === 'foodTrucks';
const FOOD_TRUCKS_TAB = FOOD_TRUCKS_HOME || storefrontConfig('networkNavigator.foodTrucks') === true;

const icons: Record<string, any> = {
    NetworkFoodTruckTab: faTruck,
    NetworkHomeTab: faCompass,
    NetworkSearchTab: faMagnifyingGlass,
    NetworkMapTab: faMap,
    NetworkCartTab: faShoppingCart,
    NetworkProfileTab: faUser,
};

const NetworkTabLabel = ({ labelKey, color, focused }: { labelKey: string; color: string; focused?: boolean }) => {
    const { t } = useLanguage();
    return <UIText style={{ color, fontSize: 11, lineHeight: 14, fontWeight: focused ? '700' : '600' }}>{t(labelKey)}</UIText>;
};

const NetworkTabIcon = ({ routeName, color }: { routeName: string; color: string }) => {
    const [cart] = useCart();
    const count = totalCartQuantity(cart?.contents?.().map((item: any) => item.serialize?.() || item) || []);

    return (
        <XStack position='relative'>
            <FontAwesomeIcon icon={icons[routeName]} size={20} color={color} />
            {routeName === 'NetworkCartTab' && count > 0 && (
                <Text position='absolute' top={-10} right={-12} minWidth={18} height={18} borderRadius={9} bg='$error' color='white' textAlign='center' fontSize={11} lineHeight={18}>
                    {count > 99 ? '99+' : count}
                </Text>
            )}
        </XStack>
    );
};

function foodTruckTab() {
    return {
        NetworkFoodTruckTab: {
            screen: NetworkFoodTruckStack,
            options: { tabBarLabel: ({ color, focused }: any) => <NetworkTabLabel labelKey='Network.tabs.trucks' color={color} focused={focused} /> },
        },
    };
}

const NetworkNavigator = createBottomTabNavigator({
    layout: StoreLayout,
    initialRouteName: FOOD_TRUCKS_HOME ? 'NetworkFoodTruckTab' : 'NetworkHomeTab',
    tabBar: (props: any) => <TabBar {...props} />,
    screenOptions: ({ route }: any) => ({
        headerShown: false,
        tabBarIcon: ({ color }: any) => <NetworkTabIcon routeName={route.name} color={color} />,
    }),
    screens: {
        ...(FOOD_TRUCKS_HOME ? foodTruckTab() : {}),
        NetworkHomeTab: {
            screen: NetworkHomeStack,
            options: { tabBarLabel: ({ color, focused }: any) => <NetworkTabLabel labelKey='Network.tabs.discover' color={color} focused={focused} /> },
        },
        ...(FOOD_TRUCKS_TAB && !FOOD_TRUCKS_HOME ? foodTruckTab() : {}),
        NetworkSearchTab: {
            screen: NetworkSearchStack,
            options: { tabBarLabel: ({ color, focused }: any) => <NetworkTabLabel labelKey='Network.tabs.search' color={color} focused={focused} /> },
        },
        NetworkMapTab: {
            screen: NetworkMapStack,
            options: { tabBarLabel: ({ color, focused }: any) => <NetworkTabLabel labelKey='Network.tabs.map' color={color} focused={focused} /> },
        },
        NetworkCartTab: {
            screen: StoreCartTab,
            options: { tabBarLabel: ({ color, focused }: any) => <NetworkTabLabel labelKey='Network.tabs.cart' color={color} focused={focused} /> },
        },
        NetworkProfileTab: {
            screen: StoreProfileTab,
            options: { tabBarLabel: ({ color, focused }: any) => <NetworkTabLabel labelKey='Network.tabs.profile' color={color} focused={focused} /> },
        },
    },
});

export default NetworkNavigator;
