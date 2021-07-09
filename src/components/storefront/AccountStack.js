import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import StorefrontAccountScreen from './AccountScreen';
import StorefrontLoginScreen from './LoginScreen';
import StorefrontCreateAccountScreen from './CreateAccountScreen';
import StorefrontEditProfileScreen from './EditProfileScreen';
import StorefrontPaymentMethodsScreen from './PaymentMethodsScreen';
import StorefrontOrderHistoryScreen from './OrderHistoryScreen';
import StorefrontChangePasswordScreen from './ChangePasswordScreen';
import StorefrontSavedPlacesScreen from './SavedPlacesScreen';
import StorefrontSearchPlaceScreen from './SearchPlacesScreen';
import StorefrontEditPlaceScreen from './EditPlaceScreen';

const MainStack = createStackNavigator();
const RootStack = createStackNavigator();
const PlacesStack = createStackNavigator();

const PlaceStackScreen = ({ route }) => {
    const { info, key } = route.params;

    return (
        <SafeAreaProvider>
            <PlacesStack.Navigator>
                <MainStack.Screen name="SearchPlace" component={StorefrontSearchPlaceScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
                <MainStack.Screen name="EditPlace" component={StorefrontEditPlaceScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
            </PlacesStack.Navigator>
        </SafeAreaProvider>
    );
};

const MainStackScreen = ({ route }) => {
    const { info, key } = route.params;

    return (
        <MainStack.Navigator>
            <MainStack.Screen name="AccountScreen" component={StorefrontAccountScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
        </MainStack.Navigator>
    );
};

const AccountStack = ({ route }) => {
    const { info, key } = route.params;

    return (
        <SafeAreaProvider>
            <RootStack.Navigator mode="modal">
                <RootStack.Screen name="AccountStack" component={MainStackScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
                <RootStack.Screen name="Login" component={StorefrontLoginScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
                <RootStack.Screen name="CreateAccount" component={StorefrontCreateAccountScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
                <RootStack.Screen name="EditProfile" component={StorefrontEditProfileScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
                <RootStack.Screen name="SavedPlaces" component={StorefrontSavedPlacesScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
                <RootStack.Screen name="AddNewPlace" component={PlaceStackScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
                <MainStack.Screen name="EditPlaceForm" component={StorefrontEditPlaceScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
                <RootStack.Screen name="PaymentMethods" component={StorefrontPaymentMethodsScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
                <RootStack.Screen name="OrderHistory" component={StorefrontOrderHistoryScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
                <RootStack.Screen name="ChangePassword" component={StorefrontChangePasswordScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
            </RootStack.Navigator>
        </SafeAreaProvider>
    );
};

export default AccountStack;
