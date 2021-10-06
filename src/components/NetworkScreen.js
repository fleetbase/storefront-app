import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { getUniqueId } from 'react-native-device-info';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCompass, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';
import { tailwind } from '../tailwind';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { EventRegister } from 'react-native-event-listeners';
import { getCurrentLocation } from '../utils';
import { useResourceStorage, get } from '../utils/storage';
import useStorefrontSdk, { adapter as StorefrontAdapter } from '../utils/use-storefront-sdk';
import useFleetbaseSdk from '../utils/use-fleetbase-sdk';
import { getCustomer } from '../utils/customer';
import { Cart, Store, StoreLocation } from '@fleetbase/storefront';
import AccountStack from './account/AccountStack';
import ExploreScreen from './network/ExploreScreen';

const { addEventListener, removeEventListener } = EventRegister;
const Tab = createBottomTabNavigator();

const NetworkScreen = ({ navigation, route }) => {
    const { info } = route.params;
    const storefront = useStorefrontSdk();
    const fleetbase = useFleetbaseSdk();
    const customer = getCustomer();

    useEffect(() => {

        return () => {};
    }, []);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, size }) => {
                    let icon;
                    switch (route.name) {
                        case 'Home':
                            icon = faCompass;
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
            }}>
            <Tab.Screen key="home" name="Home" component={ExploreScreen} initialParams={{ info }} />
            {/* <Tab.Screen key="cart" name="Cart" component={CartStack} options={cartTabOptions} initialParams={{ info, serializedCart: cart.serialize() }} /> */}
            <Tab.Screen key="account" name="Account" component={AccountStack} initialParams={{ info }} />
        </Tab.Navigator>
    );
};

export default NetworkScreen;
