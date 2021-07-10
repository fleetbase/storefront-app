/**
 * Storefront Ecommerce for On-Demand
 *
 * @format
 * @flow strict-local
 */

import 'react-native-gesture-handler';
import React from 'react';
import type { Node } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import BootScreen from './src/components/BootScreen';
import StorefrontScreen from './src/components/StorefrontScreen';
import CategoryScreen from './src/components/CategoryScreen';
import ProductScreen from './src/components/ProductScreen';
import SetupWarningScreen from './src/components/SetupWarningScreen';

const Stack = createStackNavigator();

const App: () => Node = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="Boot" component={BootScreen} options={{ headerShown: false, animationEnabled: false, gestureEnabled: false }} />
                <Stack.Screen name="StorefrontScreen" component={StorefrontScreen} options={{ headerShown: false, animationEnabled: false, gestureEnabled: false }} />
                <Stack.Screen name="CategoryScreen" component={CategoryScreen} options={{ headerShown: false }} />
                <Stack.Screen name="ProductScreen" component={ProductScreen} options={{ headerShown: false }} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default App;
