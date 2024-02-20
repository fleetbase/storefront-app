import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AccountScreen from './screens/AccountScreen';
import LoginScreen from 'auth/screens/LoginScreen';
import CreateAccountScreen from 'auth/screens/CreateAccountScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import OrderHistoryScreen from './screens/OrderHistoryScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import SavedPlacesScreen from './screens/SavedPlacesScreen';
import SearchPlaceScreen from 'places/screens/SearchPlacesScreen';
import EditPlaceScreen from 'places/screens/EditPlaceScreen';
import OrderScreen from 'shared/OrderScreen';

const MainStack = createStackNavigator();
const RootStack = createStackNavigator();
const PlacesStack = createStackNavigator();

const PlaceStackScreen = ({ route }) => {
    const { info } = route.params;

    return (
        <SafeAreaProvider>
            <PlacesStack.Navigator>
                <PlacesStack.Screen name="SearchPlace" component={SearchPlaceScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <PlacesStack.Screen name="EditPlace" component={EditPlaceScreen} options={{ headerShown: false }} initialParams={{ info }} />
            </PlacesStack.Navigator>
        </SafeAreaProvider>
    );
};

const MainStackScreen = ({ route }) => {
    const { info } = route.params;

    return (
        <MainStack.Navigator>
            <MainStack.Screen name="AccountScreen" component={AccountScreen} options={{ headerShown: false }} initialParams={{ info }} />
        </MainStack.Navigator>
    );
};

const AccountStack = ({ route }) => {
    const { info } = route.params;

    return (
        <SafeAreaProvider>
            <RootStack.Navigator screenOptions={{ presentation: 'modal' }}>
                <RootStack.Screen name="AccountStack" component={MainStackScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="CreateAccount" component={CreateAccountScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="SavedPlaces" component={SavedPlacesScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="AddNewPlace" component={PlaceStackScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <MainStack.Screen name="EditPlaceForm" component={EditPlaceScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="Order" component={OrderScreen} options={{ headerShown: false }} initialParams={{ info }} />
            </RootStack.Navigator>
        </SafeAreaProvider>
    );
};

export default AccountStack;
export { PlaceStackScreen };
