/**
 * Storefront Ecommerce for On-Demand
 *
 * @format
 * @flow strict-local
 */

import 'react-native-gesture-handler';
import React from 'react';
import type { Node } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import CoreStack from './src/features/Core/CoreStack';
// import StorefrontScreen from './src/features/core/StorefrontScreen';
// import NetworkScreen from './src/components/NetworkScreen';
// import CategoryScreen from './src/components/CategoryScreen';
// import ProductScreen from './src/components/ProductScreen';
// import SetupWarningScreen from './src/components/SetupWarningScreen';
// import StorefrontOrderScreen from './src/components/storefront/OrderScreen';
// import StorefrontHeader from './src/components/storefront/Header';

const isAndroid = Platform.OS === 'android';
const Stack = createStackNavigator();

const App: () => Node = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="CoreStack" component={CoreStack} options={{ headerShown: false, animationEnabled: false, gestureEnabled: false }} />
                {/* <Stack.Screen name="NetworkScreen" component={NetworkScreen} options={{ headerShown: false, animationEnabled: false, gestureEnabled: false }} /> */}
                {/* <Stack.Screen name="StorefrontScreen" component={StorefrontScreen} options={{ headerShown: false, animationEnabled: false, gestureEnabled: false }} /> */}
                {/* <Stack.Screen name="CategoryScreen" component={CategoryScreen} options={{ headerShown: false }} /> */}
                {/* <Stack.Screen name="ProductScreen" component={ProductScreen} options={{ headerShown: false }} /> */}
                {/* <Stack.Screen
                    name="StorefrontOrderScreen"
                    component={StorefrontOrderScreen}
                    options={{
                        headerShown: false,
                        gestureEnabled: false,
                        gestureDirection: 'vertical',
                        ...(isAndroid ? TransitionPresets.RevealFromBottomAndroid : TransitionPresets.ModalSlideFromBottomIOS),
                    }}
                /> */}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default App;
