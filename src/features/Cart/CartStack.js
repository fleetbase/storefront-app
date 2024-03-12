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
        <MainStack.Navigator screenOptions={{ headerShown: false }}>
            <MainStack.Screen name="CartScreen" component={CartScreen} initialParams={{ info, data }} />
            <MainStack.Screen name="CheckoutScreen" component={CheckoutScreen} initialParams={{ info }} />
            <MainStack.Screen name="CheckoutSavedPlaces" component={SavedPlacesScreen} initialParams={{ info }} />
            <MainStack.Screen
                name="OrderCompleted"
                component={OrderCompletedScreen}
                options={{
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
        <RootStack.Navigator screenOptions={{ presentation: 'modal', headerShown: false }}>
            <RootStack.Screen name="CartStack" component={MainStackScreen} initialParams={{ info, data }} />
            <RootStack.Screen name="CartItemScreen" component={ProductScreen} />
            <RootStack.Screen name="AddNewPlace" component={PlaceStackScreen} initialParams={{ info }} />
            <RootStack.Screen name="EditPlaceForm" component={EditPlaceScreen} initialParams={{ info }} />
            <RootStack.Screen name="LoginScreen" component={LoginScreen} initialParams={{ info }} />
            <RootStack.Screen name="CreateAccountScreen" component={CreateAccountScreen} initialParams={{ info }} />
        </RootStack.Navigator>
    );
};

export default CartStack;
