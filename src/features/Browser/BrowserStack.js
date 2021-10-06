import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './screens/HomeScreen';
import CategoryScreen from './screens/CategoryScreen';
import ProductScreen from './screens/ProductScreen';

const RootStack = createStackNavigator();

const BrowserStack = ({ route }) => {
    const { info } = route.params;

    return (
        <SafeAreaProvider>
            <RootStack.Navigator>
                <RootStack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false, animationEnabled: false, gestureEnabled: false }} initialParams={{ info }} />
                <RootStack.Screen name="CategoryScreen" component={CategoryScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="ProductScreen" component={ProductScreen} options={{ headerShown: false }} initialParams={{ info }} />
            </RootStack.Navigator>
        </SafeAreaProvider>
    );
};

export default BrowserStack;
