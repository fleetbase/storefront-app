import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BootScreen from './screens/BootScreen';
import StorefrontScreen from './screens/StorefrontScreen';
import NetworkScreen from './screens/NetworkScreen';

const RootStack = createStackNavigator();

const CoreStack = ({ route }) => {
    return (
        <RootStack.Navigator initialRouteName={'BootScreen'} screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="BootScreen" component={BootScreen} options={{ headerShown: false, animationEnabled: false, gestureEnabled: false }} />
            <RootStack.Screen name="StorefrontScreen" component={StorefrontScreen} options={{ headerShown: false, animationEnabled: false, gestureEnabled: false }} />
            <RootStack.Screen name="NetworkScreen" component={NetworkScreen} options={{ headerShown: false, animationEnabled: false, gestureEnabled: false }} />
        </RootStack.Navigator>
    );
};

export default CoreStack;
