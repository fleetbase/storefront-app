/**
 * Storefront Ecommerce for On-Demand
 *
 * @format
 * @flow strict-local
 */

import 'react-native-gesture-handler';
import React from 'react';
import type { Node } from 'react';
import { Platform, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import CoreStack from './src/features/Core/CoreStack';
import { config } from './src/utils';

const isAndroid = Platform.OS === 'android';
const Stack = createStackNavigator();

const linking = {
    prefixes: [config('APP_LINK_PREFIX'), ...config('app.linkingPrefixes')].filter(Boolean),
    config: {
        screens: {
            StoreScreen: 'store/:id'
        }
    },
};

const App: () => Node = () => {
    return (
        <NavigationContainer linking={linking} fallback={<Text>Loading...</Text>}>
            <Stack.Navigator>
                <Stack.Screen name="CoreStack" component={CoreStack} options={{ headerShown: false, animationEnabled: false, gestureEnabled: false }} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default App;
