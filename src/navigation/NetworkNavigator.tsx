import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCompass, faMagnifyingGlass, faMap, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';
import { Text, XStack } from 'tamagui';
import BackButton from '../components/BackButton';
import StoreLayout from '../layouts/StoreLayout';
import { StoreCartTab, StoreProfileTab } from './StoreNavigator';
import useCart from '../hooks/use-cart';
import { useLanguage } from '../contexts/LanguageContext';
import { totalCartQuantity } from '../network/network-runtime';
import { screenSlot } from '../extensions';

// Store, category and product screens are pushed from the Home, Search and Map
// stacks. Deep-link paths are declared only on the Home stack's copies so each
// URL resolves to exactly one route; the other stacks opt out explicitly
// (`linking: undefined`) so no paths are auto-generated for them.
const createSharedNetworkScreens = (withLinking: boolean) => ({
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
});

const NetworkHomeStack = createNativeStackNavigator({
    initialRouteName: 'NetworkHome',
    screens: {
        NetworkHome: { screen: screenSlot('network.home'), options: { headerShown: false } },
        NetworkCategory: {
            screen: screenSlot('network.directory'),
            linking: { path: 'categories/:categoryId' },
            options: ({ route }: any) => ({ title: route.params?.category?.name || '' }),
        },
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

const icons: Record<string, any> = {
    NetworkHomeTab: faCompass,
    NetworkSearchTab: faMagnifyingGlass,
    NetworkMapTab: faMap,
    NetworkCartTab: faShoppingCart,
    NetworkProfileTab: faUser,
};

const NetworkTabLabel = ({ labelKey, color }: { labelKey: string; color: string }) => {
    const { t } = useLanguage();
    return <Text color={color} fontSize='$2'>{t(labelKey)}</Text>;
};

const NetworkTabIcon = ({ routeName, color }: { routeName: string; color: string }) => {
    const [cart] = useCart();
    const count = totalCartQuantity(cart?.contents?.().map((item: any) => item.serialize?.() || item) || []);

    return (
        <XStack position='relative'>
            <FontAwesomeIcon icon={icons[routeName]} size={20} color={color} />
            {routeName === 'NetworkCartTab' && count > 0 && (
                <Text position='absolute' top={-10} right={-12} minWidth={18} height={18} borderRadius={9} bg='$red-600' color='white' textAlign='center' fontSize={11} lineHeight={18}>
                    {count > 99 ? '99+' : count}
                </Text>
            )}
        </XStack>
    );
};

const NetworkNavigator = createBottomTabNavigator({
    layout: StoreLayout,
    initialRouteName: 'NetworkHomeTab',
    screenOptions: ({ route }: any) => ({
        headerShown: false,
        tabBarIcon: ({ color }: any) => <NetworkTabIcon routeName={route.name} color={color} />,
    }),
    screens: {
        NetworkHomeTab: {
            screen: NetworkHomeStack,
            options: { tabBarLabel: ({ color }: any) => <NetworkTabLabel labelKey='Network.tabs.discover' color={color} /> },
        },
        NetworkSearchTab: {
            screen: NetworkSearchStack,
            options: { tabBarLabel: ({ color }: any) => <NetworkTabLabel labelKey='Network.tabs.search' color={color} /> },
        },
        NetworkMapTab: {
            screen: NetworkMapStack,
            options: { tabBarLabel: ({ color }: any) => <NetworkTabLabel labelKey='Network.tabs.map' color={color} /> },
        },
        NetworkCartTab: {
            screen: StoreCartTab,
            options: { tabBarLabel: ({ color }: any) => <NetworkTabLabel labelKey='Network.tabs.cart' color={color} /> },
        },
        NetworkProfileTab: {
            screen: StoreProfileTab,
            options: { tabBarLabel: ({ color }: any) => <NetworkTabLabel labelKey='Network.tabs.profile' color={color} /> },
        },
    },
});

export default NetworkNavigator;
