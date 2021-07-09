import React, { useEffect, useState } from 'react';
import { getUniqueId } from 'react-native-device-info';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStore, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';
import { tailwind } from '../tailwind';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { EventRegister } from 'react-native-event-listeners';
import { useStorefrontSdk, getCurrentLocation } from '../utils';
import StorefrontAccountScreen from './storefront/AccountScreen';
import CartStack from './storefront/CartStack';
import ShopStack from './storefront/ShopStack';
import AccountStack from './storefront/AccountStack';
import { MMKV } from 'react-native-mmkv';

const Tab = createBottomTabNavigator();

const StorefrontScreen = ({ route }) => {
    const { info, key } = route.params;
    const storefront = useStorefrontSdk();
    const [isRequestingPermission, setIsRequestingPermission] = useState(false);
    const [cart, setCart] = useState(null);
    const [cartTabOptions, setCartTabOptions] = useState({
        tabBarBadge: 2,
        tabBarBadgeStyle: tailwind('bg-blue-500 ml-1'),
    });

    const updateCartTabBadge = (cart) => {
        setCartTabOptions({ ...cartTabOptions, tabBarBadge: cart.getAttribute('total_unique_items') });
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

        // set location
        getCurrentLocation();

        return () => {
            // Remove cart.changed event listener
            EventRegister.removeEventListener(cartChangedListener);
        };
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
            }}>
            <Tab.Screen key="home" name="Home" component={ShopStack} initialParams={{ info, key }} />
            <Tab.Screen key="cart" name="Cart" component={CartStack} options={cartTabOptions} initialParams={{ info, key, loadedCart: cart }} />
            <Tab.Screen key="account" name="Account" component={AccountStack} initialParams={{ info, key }} />
        </Tab.Navigator>
    );
};

export default StorefrontScreen;

// <Modal animationType={'slide'} transparent={true} visible={isRequestingPermission} onRequestClose={() => setIsRequestingPermission(false)}>
//                 <View style={tailwind('bg-white rounded-md shadow-sm p-4 border')}>
//                     <Text>Testing</Text>
//                 </View>
//             </Modal>
