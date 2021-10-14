import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ExploreScreen from './screens/ExploreScreen';
import NetworkCategoryScreen from './screens/NetworkCategoryScreen';
import StoreScreen from './screens/StoreScreen';
import CategoryScreen from 'browser/screens/CategoryScreen';
import ProductScreen from 'browser/screens/ProductScreen';

const MainStack = createStackNavigator();
const RootStack = createStackNavigator();

const BootScreen = ({ route }) => {
    const { info } = route.params;

    return (
        <MainStack.Navigator>
            <MainStack.Screen name="ExploreScreen" component={ExploreScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <MainStack.Screen name="NetworkCategoryScreen" component={NetworkCategoryScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <MainStack.Screen name="StoreScreen" component={StoreScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <RootStack.Screen name="CategoryScreen" component={CategoryScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <RootStack.Screen name="ProductScreen" component={ProductScreen} options={{ headerShown: false }} initialParams={{ info }} />
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
