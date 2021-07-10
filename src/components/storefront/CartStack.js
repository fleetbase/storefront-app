import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import StorefrontCartScreen from './CartScreen';
import ProductScreen from '../ProductScreen';

const MainStack = createStackNavigator();
const RootStack = createStackNavigator();

const MainStackScreen = ({ route }) => {
    const { info } = route.params;

    return (
        <MainStack.Navigator>
            <MainStack.Screen name="CartScreen" component={StorefrontCartScreen} options={{ headerShown: false }} initialParams={{ info }} />
        </MainStack.Navigator>
    );
};

const CartStack = ({ route }) => {
    const { info } = route.params;

    return (
        <RootStack.Navigator mode="modal">
            <RootStack.Screen name="CartStack" component={MainStackScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <RootStack.Screen name="CartItemScreen" component={ProductScreen} options={{ headerShown: false }} />
        </RootStack.Navigator>
    );
};

export default CartStack;
