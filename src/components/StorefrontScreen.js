import React from 'react';
// import { SafeAreaView, View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStore, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';
import { tailwind } from '../tailwind';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import StorefrontAccountScreen from './storefront/AccountScreen';
import StorefrontCartScreen from './storefront/CartScreen';
import ShopStack from './storefront/ShopStack';

const Tab = createBottomTabNavigator();

const StorefrontScreen =  ({ route }) => {
    const { info, key } = route.params;

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, size }) => {
                    let icon;

                    switch (route.name) {
                        case 'Home':
                            icon = faStore;
                            break;

                        case 'Cart':
                            icon = faShoppingCart;
                            break;

                        case 'Account':
                            icon = faUser;
                            break;
                    }

                    // You can return any component that you like here!
                    return <FontAwesomeIcon icon={icon} size={size} color={focused ? '#93C5FD' : '#6B7280'} />;
                },
            })}
            tabBarOptions={{
                style: tailwind('bg-black border-black'),
                tabStyle: tailwind('bg-black border-black'),
                showLabel: false,
            }}
        >
            <Tab.Screen key="home" name="Home" component={ShopStack} initialParams={{ info, key }} />
            <Tab.Screen key="cart" name="Cart" component={StorefrontCartScreen} initialParams={{ info, key }} />
            <Tab.Screen key="account" name="Account" component={StorefrontAccountScreen} initialParams={{ info, key }} />
        </Tab.Navigator>
    );
};

export default StorefrontScreen;
