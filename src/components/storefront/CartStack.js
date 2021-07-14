import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import StorefrontCartScreen from './CartScreen';
import StorefrontCheckoutScreen from './CheckoutScreen';
import StorefrontSavedPlacesScreen from './SavedPlacesScreen';
import ProductScreen from '../ProductScreen';
import StorefrontEditPlaceScreen from './EditPlaceScreen';
import { PlaceStackScreen } from './AccountStack';

const MainStack = createStackNavigator();
const RootStack = createStackNavigator();

const MainStackScreen = ({ route }) => {
    const { info } = route.params;

    return (
        <MainStack.Navigator>
            <MainStack.Screen name="CartScreen" component={StorefrontCartScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <MainStack.Screen name="CheckoutScreen" component={StorefrontCheckoutScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <MainStack.Screen name="CheckoutSavedPlaces" component={StorefrontSavedPlacesScreen} options={{ headerShown: false }} initialParams={{ info }} />
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
        </RootStack.Navigator>
    );
};

export default CartStack;
