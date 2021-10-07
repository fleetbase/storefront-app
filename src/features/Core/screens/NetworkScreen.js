import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { getUniqueId } from 'react-native-device-info';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCompass, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { EventRegister } from 'react-native-event-listeners';
import { getCurrentLocation, logError } from 'utils';
import { useResourceStorage, get } from 'utils/Storage';
import { tailwind } from 'tailwind';
import { getCustomer, syncDevice } from 'utils/Customer';
import { Cart, Store, StoreLocation } from '@fleetbase/storefront';
import { useCart, useCartTabOptions, useCustomer } from 'hooks';
import { CartService } from 'services';
// import useStorefront from 'hooks/use-storefront';
// import useFleetbase from 'hooks/use-fleetbase';
import NetworkStack from 'network/NetworkStack';
import CartStack from 'cart/CartStack';
import AccountStack from 'account/AccountStack';

const { addEventListener, removeEventListener } = EventRegister;
const Tab = createBottomTabNavigator();

const NetworkScreen = ({ navigation, route }) => {
    const { info } = route.params;

    const [cart, setCart] = useCart();
    const [cartTabOptions, setCartTabOptions] = useCartTabOptions(cart);
    const [customer, setCustomer] = useCustomer();

    useEffect(() => {
        // Fetch latest cart
        CartService.get()
            .then((cart) => {
                setCart(cart);
                setCartTabOptions(cart);
            })
            .catch(logError);

        // Sync device
        syncDevice(customer);

        // Set location
        getCurrentLocation();

        // Listen for incoming remote notification events
        const watchNotifications = addEventListener('onNotification', (notification) => {
            const { data } = notification;
            const { id, type } = data;

            if (type.startsWith('order_')) {
                // navigateToOrder(id);
                NavigationService.transitionToOrder(id);
            }
        });

        // Listen for cart updated event
        const cartChanged = addEventListener('cart.updated', (cart) => {
            setCartTabOptions(cart);
        });

        return () => {
            removeEventListener(watchNotifications);
            removeEventListener(cartChanged);
        };
    }, []);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, size }) => {
                    let icon;
                    switch (route.name) {
                        case 'Network':
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
            <Tab.Screen key="network" name="Network" component={NetworkStack} initialParams={{ info }} />
            <Tab.Screen key="cart" name="Cart" component={CartStack} options={cartTabOptions} initialParams={{ info, serializedCart: cart.serialize() }} />
            <Tab.Screen key="account" name="Account" component={AccountStack} initialParams={{ info }} />
        </Tab.Navigator>
    );
};

export default NetworkScreen;
