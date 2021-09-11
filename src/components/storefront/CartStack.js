import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import StorefrontCartScreen from './CartScreen';
import StorefrontCheckoutScreen from './CheckoutScreen';
import StorefrontSavedPlacesScreen from './SavedPlacesScreen';
import StorefrontPaymentMethodsScreen from './PaymentMethodsScreen';
import ProductScreen from '../ProductScreen';
import StorefrontEditPlaceScreen from './EditPlaceScreen';
import StorefrontAddPaymentMethodScreen from './AddPaymentMethodScreen';
import StorefrontOrderCompletedScreen from './OrderCompletedScreen';
import StorefrontLoginScreen from './LoginScreen';
import StorefrontCreateAccountScreen from './CreateAccountScreen';
import { PlaceStackScreen } from './AccountStack';

const isAndroid = Platform.OS === 'android';
const MainStack = createStackNavigator();
const RootStack = createStackNavigator();

const MainStackScreen = ({ route }) => {
    const { info } = route.params;

    return (
        <MainStack.Navigator>
            <MainStack.Screen name="CartScreen" component={StorefrontCartScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <MainStack.Screen name="CheckoutScreen" component={StorefrontCheckoutScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <MainStack.Screen name="CheckoutSavedPlaces" component={StorefrontSavedPlacesScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <MainStack.Screen name="CheckoutPaymentMethods" component={StorefrontPaymentMethodsScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <MainStack.Screen
                name="OrderCompleted"
                component={StorefrontOrderCompletedScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: false,
                    gestureDirection: 'vertical',
                    ...(isAndroid ? TransitionPresets.RevealFromBottomAndroid : TransitionPresets.ModalSlideFromBottomIOS),
                }}
                initialParams={{ info }}
            />
        </MainStack.Navigator>
    );
};

const CartStack = ({ route }) => {
    const { info } = route.params;

    return (
        <RootStack.Navigator mode="modal">
            <RootStack.Screen name="CartStack" component={MainStackScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <RootStack.Screen name="CartItemScreen" component={ProductScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="AddNewPlace" component={PlaceStackScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <MainStack.Screen name="EditPlaceForm" component={StorefrontEditPlaceScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <RootStack.Screen name="AddPaymentMethod" component={StorefrontAddPaymentMethodScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <RootStack.Screen name="LoginScreen" component={StorefrontLoginScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <RootStack.Screen name="CreateAccountScreen" component={StorefrontCreateAccountScreen} options={{ headerShown: false }} initialParams={{ info }} />
        </RootStack.Navigator>
    );
};

export default CartStack;
