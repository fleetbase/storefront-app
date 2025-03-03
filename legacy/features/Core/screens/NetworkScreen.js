import { faCompass, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AccountStack from 'account/AccountStack';
import CartStack from 'cart/CartStack';
import { useCart, useCartTabOptions, useCustomer, useLocale, useMountedState } from 'hooks';
import NetworkStack from 'network/NetworkStack';
import React, { useEffect } from 'react';
import { EventRegister } from 'react-native-event-listeners';
import { CartService } from 'services';
import { tailwind } from 'tailwind';
import { getCurrentLocation, logError } from 'utils';
import { syncDevice } from 'utils/Customer';

const { addEventListener, removeEventListener } = EventRegister;
const Tab = createBottomTabNavigator();

const NetworkScreen = ({ navigation, route }) => {
    const { info } = route.params;

    const [cart, setCart] = useCart();
    const [cartTabOptions, setCartTabOptions] = useCartTabOptions(cart);
    const [customer, setCustomer] = useCustomer();
    const [locale, setLocale] = useLocale();
    const isMounted = useMountedState();

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
    }, [isMounted]);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarStyle: tailwind('bg-black border-black'),
                tabBarItemStyle: tailwind('bg-black border-black'),
                tabBarShowLabel: false,
                headerShown: false,
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
        >
            <Tab.Screen key='network' name='Network' component={NetworkStack} initialParams={{ info }} />
            <Tab.Screen key='cart' name='Cart' component={CartStack} options={cartTabOptions} initialParams={{ info, serializedCart: cart?.serialize() }} />
            <Tab.Screen key='account' name='Account' component={AccountStack} initialParams={{ info }} />
        </Tab.Navigator>
    );
};

export default NetworkScreen;
