/**
 * Storefront Ecommerce for On-Demand
 *
 * @format
 * @flow strict-local
 */

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import type { Node } from 'react';
import React from 'react';
import { ActivityIndicator, LogBox, Platform, Text, View } from 'react-native';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import tailwind from 'tailwind';
import CoreStack from './src/features/Core/CoreStack';
import { config } from './src/utils';

const isAndroid = Platform.OS === 'android';
const Stack = createStackNavigator();

const linking = {
    prefixes: [config('APP_LINK_PREFIX'), ...config('app.linkingPrefixes')].filter(Boolean),
    config: {
        screens: {
            StoreScreen: 'store/:id',
        },
    },
};

const App: () => Node = () => {
    LogBox.ignoreLogs(['RCTUIManager.measureLayoutRelativeToParent']);

    return (
        <SafeAreaProvider>
            <NavigationContainer
                linking={linking}
                fallback={
                    <View style={tailwind('bg-white flex items-center justify-center w-full h-full')}>
                        <View style={tailwind('flex items-center justify-center')}>
                            <ActivityIndicator style={tailwind('mb-4')} />
                            <Text style={tailwind('text-gray-700')}>Loading...</Text>
                        </View>
                    </View>
                }>
                <Stack.Navigator>
                    <Stack.Screen name="CoreStack" component={CoreStack} options={{ headerShown: false, animationEnabled: false, gestureEnabled: false }} />
                </Stack.Navigator>
            </NavigationContainer>
        </SafeAreaProvider>
    );
};

export default App;
