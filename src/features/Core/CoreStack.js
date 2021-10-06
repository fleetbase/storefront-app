import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BootScreen from './screens/BootScreen';
import StorefrontScreen from './screens/StorefrontScreen';
import NetworkScreen from './screens/NetworkScreen';

const RootStack = createStackNavigator();

const CoreStack = ({ route }) => {
    return (
        <SafeAreaProvider>
            <RootStack.Navigator>
                <RootStack.Screen name="BootScreen" component={BootScreen} options={{ headerShown: false, animationEnabled: false, gestureEnabled: false }} />
                <RootStack.Screen name="StorefrontScreen" component={StorefrontScreen} options={{ headerShown: false, animationEnabled: false, gestureEnabled: false }} />
                <RootStack.Screen name="NetworkScreen" component={NetworkScreen} options={{ headerShown: false, animationEnabled: false, gestureEnabled: false }} />
            </RootStack.Navigator>
        </SafeAreaProvider>
    );
};

export default CoreStack;
