import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CategoryScreen from '../CategoryScreen';
import ProductScreen from '../ProductScreen';
import StorefrontHomeScreen from './HomeScreen';

const Stack = createStackNavigator();

const ShopStack = ({ route }) => {
    const { info, key } = route.params;

    return (
        <Stack.Navigator>
            <Stack.Screen name="HomeScreen" component={StorefrontHomeScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
            <Stack.Screen name="CategoryScreen" component={CategoryScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ProductScreen" component={ProductScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
    );
};

export default ShopStack;
