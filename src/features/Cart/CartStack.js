import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import CartScreen from './screens/CartScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import SavedPlacesScreen from 'account/screens/SavedPlacesScreen';
import ProductScreen from 'browser/screens/ProductScreen';
import EditPlaceScreen from 'places/screens/EditPlaceScreen';
import OrderCompletedScreen from 'shared/OrderCompletedScreen';
import LoginScreen from 'auth/screens/LoginScreen';
import CreateAccountScreen from 'auth/screens//CreateAccountScreen';
import { PlaceStackScreen } from 'account/AccountStack';

const isAndroid = Platform.OS === 'android';
const MainStack = createStackNavigator();
const RootStack = createStackNavigator();

const MainStackScreen = ({ route }) => {
    const { info, data } = route.params;

    return (
        <MainStack.Navigator>
            <MainStack.Screen name="CartScreen" component={CartScreen} options={{ headerShown: false }} initialParams={{ info, data }} />
            <MainStack.Screen name="CheckoutScreen" component={CheckoutScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <MainStack.Screen name="CheckoutSavedPlaces" component={SavedPlacesScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <MainStack.Screen
                name="OrderCompleted"
                component={OrderCompletedScreen}
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
    const { info, data } = route.params;

    return (
        <RootStack.Navigator mode="modal">
            <RootStack.Screen name="CartStack" component={MainStackScreen} options={{ headerShown: false }} initialParams={{ info, data }} />
            <RootStack.Screen name="CartItemScreen" component={ProductScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="AddNewPlace" component={PlaceStackScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <MainStack.Screen name="EditPlaceForm" component={EditPlaceScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <RootStack.Screen name="LoginScreen" component={LoginScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <RootStack.Screen name="CreateAccountScreen" component={CreateAccountScreen} options={{ headerShown: false }} initialParams={{ info }} />
        </RootStack.Navigator>
    );
};

export default CartStack;
