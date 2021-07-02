import React, { useEffect, useState } from 'react';
// import { SafeAreaView, View, Text } from 'react-native';
import { getUniqueId } from 'react-native-device-info';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStore, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';
import { tailwind } from '../tailwind';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { EventRegister } from 'react-native-event-listeners';
import Storefront from '@fleetbase/storefront';
import StorefrontAccountScreen from './storefront/AccountScreen';
// import StorefrontCartScreen from './storefront/CartScreen';
import CartStack from './storefront/CartStack';
import ShopStack from './storefront/ShopStack';

const Tab = createBottomTabNavigator();

const StorefrontScreen =  ({ route }) => {
    const { info, key } = route.params;
    const storefront = new Storefront(key, { host: 'https://v2api.fleetbase.engineering' });
    const [ cart, setCart ] = useState(null);
    const [ cartTabOptions, setCartTabOptions ] = useState({
        tabBarBadge: 2, 
        tabBarBadgeStyle: tailwind('bg-blue-500 ml-1')
    });

    const updateCartTabBadge = (cart) => {
        cartTabOptions.tabBarBadge = cart.getAttribute('total_unique_items');
        setCartTabOptions(cartTabOptions);

        console.log(`🚨 Cart tab badge should refelect ${cart.getAttribute('total_unique_items')} items in cart`);
    };

    const updateCartState = (cart) => {
        setCart(cart);
        updateCartTabBadge(cart);
    };

    const getCart = () => {
        return storefront.cart.retrieve(getUniqueId()).then((cart) => {
            updateCartState(cart);
            return cart;
        });
    };

    useEffect(() => {
        // Listen for cart changed event
        const cartChangedListener = EventRegister.addEventListener('cart.changed', (cart) => {
            console.log('🚨 Cart state changed!');
            updateCartState(cart);
        });

        return () => {
            // Remove cart.changed event listener
            EventRegister.removeEventListener(cartChangedListener);
        }
    }, []);

    if (!cart) {
        getCart();
    }

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
            <Tab.Screen key="cart" name="Cart" component={CartStack} options={cartTabOptions} initialParams={{ info, key, loadedCart: cart }} />
            <Tab.Screen key="account" name="Account" component={StorefrontAccountScreen} initialParams={{ info, key }} />
        </Tab.Navigator>
    );
};

export default StorefrontScreen;
