import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ExploreScreen from './screens/ExploreScreen';
import StoreScreen from './screens/StoreScreen';

const MainStack = createStackNavigator();
const RootStack = createStackNavigator();

const BootScreen = ({ route }) => {
    const { info } = route.params;

    return (
        <MainStack.Navigator>
            <MainStack.Screen name="ExploreScreen" component={ExploreScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <MainStack.Screen name="StoreScreen" component={StoreScreen} options={{ headerShown: false }} initialParams={{ info }} />
        </MainStack.Navigator>
    );
};

const NetworkStack = ({ route }) => {
    const { info } = route.params;

    return (
        <SafeAreaProvider>
            <RootStack.Navigator>
                <RootStack.Screen name="NetworkStack" component={BootScreen} options={{ headerShown: false }} initialParams={{ info }} />
            </RootStack.Navigator>
        </SafeAreaProvider>
    );
};

export default NetworkStack;
