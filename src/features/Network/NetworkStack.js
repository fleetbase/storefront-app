import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ExploreScreen from './screens/ExploreScreen';
import MapScreen from './screens/MapScreen';
import NetworkCategoryScreen from './screens/NetworkCategoryScreen';
import StoreScreen from './screens/StoreScreen';
import CategoryScreen from 'browser/screens/CategoryScreen';
import ProductScreen from 'browser/screens/ProductScreen';
import StoreLocationScreen from 'shared/StoreLocationScreen';
import StorePhotosScreen from 'shared/StorePhotosScreen';
import StoreReviewsScreen from 'shared/StoreReviewsScreen';
import WriteReviewScreen from 'shared/WriteReviewScreen';
import LocationPickerScreen from 'shared/LocationPickerScreen';
import LoginScreen from 'auth/screens/LoginScreen';
import CreateAccountScreen from 'auth/screens//CreateAccountScreen';

const MainStack = createStackNavigator();
const RootStack = createStackNavigator();
const StoreStack = createStackNavigator();
const MapStack = createStackNavigator();
const LocationStack = createStackNavigator();

const verticalAnimation = {
    gestureDirection: 'vertical',
    cardStyleInterpolator: ({ current, layouts }) => {
        return {
            cardStyle: {
                transform: [
                    {
                        translateY: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [layouts.screen.height, 0],
                        }),
                    },
                ],
            },
        };
    },
};

const StoreScreenStack = ({ route }) => {
    const { info } = route.params;

    return (
        <StoreStack.Navigator screenOptions={{ presentation: 'modal', headerShown: false }}>
            <StoreStack.Screen name="StoreScreen" component={StoreScreen} initialParams={route.params} />
            <StoreStack.Screen name="StoreLocationScreen" component={StoreLocationScreen} initialParams={{ info }} />
            <StoreStack.Screen name="StorePhotosScreen" component={StorePhotosScreen} initialParams={{ info }} />
            <StoreStack.Screen name="StoreReviewsScreen" component={StoreReviewsScreen} initialParams={{ info }} />
            <StoreStack.Screen name="WriteReviewScreen" component={WriteReviewScreen} initialParams={{ info }} />
            <StoreStack.Screen name="LoginScreen" component={LoginScreen} initialParams={{ info }} />
            <StoreStack.Screen name="CreateAccountScreen" component={CreateAccountScreen} initialParams={{ info }} />
        </StoreStack.Navigator>
    );
};

const MapViewStack = ({ route }) => {
    const { info } = route.params;

    return (
        <MapStack.Navigator screenOptions={{ presentation: 'modal', headerShown: false }}>
            <MapStack.Screen name="MapScreen" component={MapScreen} initialParams={route.params} />
            <MapStack.Screen name="StoreScreen" component={StoreScreenStack} initialParams={{ info }} />
        </MapStack.Navigator>
    );
};
const LocationPickerStack = ({ route }) => {
    const { info } = route.params;

    return (
        <LocationStack.Navigator screenOptions={{ presentation: 'modal' }}>
            <LocationStack.Screen name="LocationPickerScreen" component={LocationPickerScreen} initialParams={route.params} options={{ headerShown: false, gesturesEnabled: false }} />
        </LocationStack.Navigator>
    );
};

const BootScreen = ({ route }) => {
    const { info } = route.params;

    return (
        <MainStack.Navigator screenOptions={{ headerShown: false }}>
            <MainStack.Screen name="ExploreScreen" component={ExploreScreen} initialParams={{ info }} />
            <MainStack.Screen name="NetworkCategoryScreen" component={NetworkCategoryScreen} initialParams={{ info }} />
            <MainStack.Screen name="StoreScreen" component={StoreScreenStack} initialParams={{ info }} />
            <MainStack.Screen name="MapScreen" component={MapViewStack} options={{ ...verticalAnimation }} initialParams={{ info }} />
            <MainStack.Screen name="CategoryScreen" component={CategoryScreen} initialParams={{ info }} />
            <MainStack.Screen name="ProductScreen" component={ProductScreen} initialParams={{ info }} />
            <MainStack.Screen name="LocationPickerStack" component={LocationPickerStack} initialParams={{ info }} />
        </MainStack.Navigator>
    );
};

const NetworkStack = ({ route }) => {
    const { info } = route.params;

    return (
        <SafeAreaProvider>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                <RootStack.Screen name="NetworkStack" component={BootScreen} initialParams={{ info }} />
            </RootStack.Navigator>
        </SafeAreaProvider>
    );
};

export default NetworkStack;
