import { faShoppingCart, faStore, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AccountStack from 'account/AccountStack';
import BrowserStack from 'browser/BrowserStack';
import CartStack from 'cart/CartStack';
import { useCart, useCartTabOptions, useCustomer, useStoreLocation } from 'hooks';
import useFleetbase from 'hooks/use-fleetbase';
import React, { useEffect, useState } from 'react';
import { EventRegister } from 'react-native-event-listeners';
import { CartService, NavigationService, StoreInfoService } from 'services';
import { tailwind } from 'tailwind';
import { logError } from 'utils';
import { syncDevice } from 'utils/Customer';
import { getCurrentLocation } from 'utils/Geo';

const { addEventListener, removeEventListener } = EventRegister;
const Tab = createBottomTabNavigator();

const StorefrontScreen = ({ navigation, route }) => {
    let { info } = route.params;

    const fleetbase = useFleetbase();

    const [isRequestingPermission, setIsRequestingPermission] = useState(false);
    const [customer, setCustomer] = useCustomer();
    const [storeLocation, setStoreLocation] = useStoreLocation();
    const [cart, setCart] = useCart();
    const [storeLocations, setStoreLocations] = useState([]);
    const [cartTabOptions, setCartTabOptions] = useCartTabOptions(cart);

    useEffect(() => {
        // Fetch latest cart
        CartService.get()
            .then((cart) => {
                setCart(cart);
                setCartTabOptions(cart);
            })
            .catch(logError);

        // Fetch and set default store location
        StoreInfoService.getDefaultLocation()
            .then((locations) => {
                setStoreLocation(locations.defaultStoreLocation);
                setStoreLocations(locations.locations);
            })
            .catch(logError);

        // Set location
        getCurrentLocation();

        // Sync device
        syncDevice(customer);

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
                        case 'Browser':
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
                tabBarShowLabel: false,
                headerShown: false,
                tabBarStyleItem: tailwind('bg-black border-black'),
                tabBarStyle: tailwind('bg-black border-black'),
            })}>
            <Tab.Screen key="browser" name="Browser" component={BrowserStack} initialParams={{ info: { ...info, defaultStoreLocation: storeLocation, storeLocations: storeLocations } }} />
            <Tab.Screen key="cart" name="Cart" component={CartStack} options={cartTabOptions} initialParams={{ info: { ...info, storeLocations: storeLocation }, data: cart?.serialize() }} />
            <Tab.Screen key="account" name="Account" component={AccountStack} initialParams={{ info }} />
        </Tab.Navigator>
    );
};

export default StorefrontScreen;
