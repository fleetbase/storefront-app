import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ExploreScreen from './screens/ExploreScreen';
import NetworkCategoryScreen from './screens/NetworkCategoryScreen';
import StoreScreen from './screens/StoreScreen';
import CategoryScreen from 'browser/screens/CategoryScreen';
import ProductScreen from 'browser/screens/ProductScreen';
import StoreLocationScreen from 'shared/StoreLocationScreen';
import StorePhotosScreen from 'shared/StorePhotosScreen';
import StoreReviewsScreen from 'shared/StoreReviewsScreen';
import WriteReviewScreen from 'shared/WriteReviewScreen';
import LoginScreen from 'auth/screens/LoginScreen';
import CreateAccountScreen from 'auth/screens//CreateAccountScreen';

const MainStack = createStackNavigator();
const RootStack = createStackNavigator();
const StoreStack = createStackNavigator();

const StoreScreenStack = ({ route }) => {
    const { info } = route.params;

    return (
        <StoreStack.Navigator mode="modal">
            <StoreStack.Screen name="StoreScreen" component={StoreScreen} options={{ headerShown: false }} initialParams={route.params} />
            <StoreStack.Screen name="StoreLocationScreen" component={StoreLocationScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <StoreStack.Screen name="StorePhotosScreen" component={StorePhotosScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <StoreStack.Screen name="StoreReviewsScreen" component={StoreReviewsScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <StoreStack.Screen name="WriteReviewScreen" component={WriteReviewScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <StoreStack.Screen name="LoginScreen" component={LoginScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <StoreStack.Screen name="CreateAccountScreen" component={CreateAccountScreen} options={{ headerShown: false }} initialParams={{ info }} />
        </StoreStack.Navigator>
    );
};

const BootScreen = ({ route }) => {
    const { info } = route.params;

    return (
        <MainStack.Navigator>
            <MainStack.Screen name="ExploreScreen" component={ExploreScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <MainStack.Screen name="NetworkCategoryScreen" component={NetworkCategoryScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <MainStack.Screen name="StoreScreen" component={StoreScreenStack} options={{ headerShown: false }} initialParams={{ info }} />
            <MainStack.Screen name="CategoryScreen" component={CategoryScreen} options={{ headerShown: false }} initialParams={{ info }} />
            <MainStack.Screen name="ProductScreen" component={ProductScreen} options={{ headerShown: false }} initialParams={{ info }} />
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
