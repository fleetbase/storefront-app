import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCompass, faMagnifyingGlass, faMap, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';
import { Text, XStack } from 'tamagui';
import MarketplaceDiscoverScreen from '../screens/MarketplaceDiscoverScreen';
import MarketplaceSearchScreen from '../screens/MarketplaceSearchScreen';
import MarketplaceMapScreen from '../screens/MarketplaceMapScreen';
import MarketplaceCategoryScreen from '../screens/MarketplaceCategoryScreen';
import MarketplaceStoreScreen from '../screens/MarketplaceStoreScreen';
import MarketplaceProductScreen from '../screens/MarketplaceProductScreen';
import StoreCategoryScreen from '../screens/StoreCategoryScreen';
import StoreInfoScreen from '../screens/StoreInfoScreen';
import BackButton from '../components/BackButton';
import StoreLayout from '../layouts/StoreLayout';
import { StoreCartTab, StoreProfileTab } from './StoreNavigator';
import useCart from '../hooks/use-cart';
import { useLanguage } from '../contexts/LanguageContext';
import { totalCartQuantity } from '../utils/marketplace-runtime';

const sharedMarketplaceScreens = {
    MarketplaceStore: {
        screen: MarketplaceStoreScreen,
        linking: { path: 'marketplace/stores/:storeId' },
        options: { headerShown: false },
    },
    StoreCategory: {
        screen: StoreCategoryScreen,
        linking: { path: 'marketplace/stores/:storeId/categories/:categoryId' },
        options: ({ route, navigation }: any) => ({
            title: route.params?.category?.name || '',
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
        }),
    },
    Product: {
        screen: MarketplaceProductScreen,
        linking: { path: 'marketplace/stores/:storeId/products/:productId' },
        options: { presentation: 'modal', headerShown: false },
    },
    StoreInfo: { screen: StoreInfoScreen, options: { presentation: 'modal', headerShown: false } },
};

const MarketplaceDiscoverStack = createNativeStackNavigator({
    initialRouteName: 'MarketplaceDiscover',
    screens: {
        MarketplaceDiscover: { screen: MarketplaceDiscoverScreen, options: { headerShown: false } },
        MarketplaceCategory: {
            screen: MarketplaceCategoryScreen,
            linking: { path: 'marketplace/categories/:categoryId' },
            options: ({ route }: any) => ({ title: route.params?.category?.name || '' }),
        },
        ...sharedMarketplaceScreens,
    },
});

const MarketplaceSearchStack = createNativeStackNavigator({
    screens: {
        MarketplaceSearch: { screen: MarketplaceSearchScreen, options: { headerShown: false } },
        ...sharedMarketplaceScreens,
    },
});

const MarketplaceMapStack = createNativeStackNavigator({
    screens: {
        MarketplaceMap: { screen: MarketplaceMapScreen, options: { headerShown: false } },
        ...sharedMarketplaceScreens,
    },
});

const icons: Record<string, any> = {
    MarketplaceDiscoverTab: faCompass,
    MarketplaceSearchTab: faMagnifyingGlass,
    MarketplaceMapTab: faMap,
    MarketplaceCartTab: faShoppingCart,
    MarketplaceProfileTab: faUser,
};

const MarketplaceTabLabel = ({ labelKey, color }: { labelKey: string; color: string }) => {
    const { t } = useLanguage();
    return <Text color={color} fontSize='$2'>{t(labelKey)}</Text>;
};

const MarketplaceTabIcon = ({ routeName, color }: { routeName: string; color: string }) => {
    const [cart] = useCart();
    const count = totalCartQuantity(cart?.contents?.().map((item: any) => item.serialize?.() || item) || []);

    return (
        <XStack position='relative'>
            <FontAwesomeIcon icon={icons[routeName]} size={20} color={color} />
            {routeName === 'MarketplaceCartTab' && count > 0 && (
                <Text position='absolute' top={-10} right={-12} minWidth={18} height={18} borderRadius={9} bg='$red10' color='white' textAlign='center' fontSize={11} lineHeight={18}>
                    {count > 99 ? '99+' : count}
                </Text>
            )}
        </XStack>
    );
};

const NetworkNavigator = createBottomTabNavigator({
    layout: StoreLayout,
    initialRouteName: 'MarketplaceDiscoverTab',
    screenOptions: ({ route }: any) => ({
        headerShown: false,
        tabBarIcon: ({ color }: any) => <MarketplaceTabIcon routeName={route.name} color={color} />,
    }),
    screens: {
        MarketplaceDiscoverTab: {
            screen: MarketplaceDiscoverStack,
            options: { tabBarLabel: ({ color }: any) => <MarketplaceTabLabel labelKey='Marketplace.tabs.discover' color={color} /> },
        },
        MarketplaceSearchTab: {
            screen: MarketplaceSearchStack,
            options: { tabBarLabel: ({ color }: any) => <MarketplaceTabLabel labelKey='Marketplace.tabs.search' color={color} /> },
        },
        MarketplaceMapTab: {
            screen: MarketplaceMapStack,
            options: { tabBarLabel: ({ color }: any) => <MarketplaceTabLabel labelKey='Marketplace.tabs.map' color={color} /> },
        },
        MarketplaceCartTab: {
            screen: StoreCartTab,
            options: { tabBarLabel: ({ color }: any) => <MarketplaceTabLabel labelKey='Marketplace.tabs.cart' color={color} /> },
        },
        MarketplaceProfileTab: {
            screen: StoreProfileTab,
            options: { tabBarLabel: ({ color }: any) => <MarketplaceTabLabel labelKey='Marketplace.tabs.profile' color={color} /> },
        },
    },
});

export default NetworkNavigator;
