import React, { useEffect, useState } from 'react';
import { getUniqueId } from 'react-native-device-info';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStore, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';
import { tailwind } from '../tailwind';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { EventRegister } from 'react-native-event-listeners';
import { getCurrentLocation } from '../utils';
import { useResourceStorage, get } from '../utils/storage';
import useStorefrontSdk, { adapter as StorefrontAdapter } from '../utils/use-storefront-sdk';
import useFleetbaseSdk from '../utils/use-fleetbase-sdk';
import { getCustomer } from '../utils/customer';
import { Cart, Store, StoreLocation } from '@fleetbase/storefront';
import StorefrontAccountScreen from './storefront/AccountScreen';
import CartStack from './storefront/CartStack';
import ShopStack from './storefront/ShopStack';
import AccountStack from './storefront/AccountStack';

const { addEventListener, removeEventListener } = EventRegister;
const Tab = createBottomTabNavigator();

const StorefrontScreen = ({ navigation, route }) => {
    const { info } = route.params;
    const storefront = useStorefrontSdk();
    const fleetbase = useFleetbaseSdk();
    const customer = getCustomer();
    const store = new Store(info, StorefrontAdapter);
    const [isRequestingPermission, setIsRequestingPermission] = useState(false);
    const [storeLocation, setStoreLocation] = useResourceStorage('store_location', StoreLocation, StorefrontAdapter);
    const [cart, setCart] = useResourceStorage('cart', Cart, StorefrontAdapter, new Cart({}, StorefrontAdapter));
    const [cartTabOptions, setCartTabOptions] = useState({
        tabBarBadge: cart instanceof Cart ? cart.getAttribute('total_unique_items') : 0,
        tabBarBadgeStyle: tailwind('bg-blue-500 ml-1'),
    });

    const syncDevice = (customer) => {
        const token = get('token');

        if (customer && token) {
            customer.syncDevice(token).catch((error) => {
                console.log('[Error syncing customer device!]', error);
            });
        }
    };

    const updateCartTabBadge = (cart) => {
        setCartTabOptions({ ...cartTabOptions, tabBarBadge: cart.getAttribute('total_unique_items') });
    };

    const updateCartState = (cart) => {
        setCart(cart);
        updateCartTabBadge(cart);
    };

    const getCart = () => {
        return storefront.cart.retrieve(getUniqueId()).then((cart) => {
            if (cart instanceof Cart) {
                updateCartState(cart);

                return cart;
            }
            
            throw new Error('Cart failed to load via SDK!');
        }).catch((error) => {
            console.log('[Error fetching cart!]', error);
        });
    };

    const navigateToOrder = (orderId) => {
        fleetbase.orders.findRecord(orderId).then((order) => {
            navigation.navigate('StorefrontOrderScreen', { serializedOrder: order.serialize(), info });
        }).catch((error) => {
            console.log('[Error fetching order record!]', error);
        });
    };

    const setDefaultStoreLocation = () => {
        store.getLocations().then((locations) => {
            const defaultStoreLocation = locations.first;

            if (defaultStoreLocation) {
                setStoreLocation(defaultStoreLocation);
            }
        }).catch((error) => {
            console.log('[Error fetching store locations!]', error);
        });
    };

    useEffect(() => {
        // Always fetch latest cart
        getCart();

        // Listen for cart changed event
        const cartChanged = addEventListener('cart.changed', (cart) => {
            updateCartState(cart);
        });

        // Listen for incoming remote notification events
        const watchNotifications = addEventListener('onNotification', (notification) => {
            const { data } = notification;
            const { id, type } = data;

            if (type.startsWith('order_')) {
                navigateToOrder(id);
            }
        });

        // Set default store
        setDefaultStoreLocation();

        // Set location
        getCurrentLocation();

        // Sync device
        syncDevice(customer);

        return () => {
            // Remove cart.changed event listener
            removeEventListener(cartChanged);
            // Remove onNotification event listener
            removeEventListener(watchNotifications);
        };
    }, []);

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
            }}>
            <Tab.Screen key="home" name="Home" component={ShopStack} initialParams={{ info }} />
            <Tab.Screen key="cart" name="Cart" component={CartStack} options={cartTabOptions} initialParams={{ info, serializedCart: cart.serialize() }} />
            <Tab.Screen key="account" name="Account" component={AccountStack} initialParams={{ info }} />
        </Tab.Navigator>
    );
};

export default StorefrontScreen;
