import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AccountScreen from './AccountScreen';
import LoginScreen from './LoginScreen';
import CreateAccountScreen from './CreateAccountScreen';
import EditProfileScreen from './EditProfileScreen';
// import PaymentMethodsScreen from './PaymentMethodsScreen';
import OrderHistoryScreen from './OrderHistoryScreen';
import ChangePasswordScreen from './ChangePasswordScreen';
import SavedPlacesScreen from './SavedPlacesScreen';
import SearchPlaceScreen from './SearchPlacesScreen';
import EditPlaceScreen from './EditPlaceScreen';
import AddPaymentMethodScreen from './AddPaymentMethodScreen';
import OrderScreen from '../shared/OrderScreen';

const MainStack = createStackNavigator();
const RootStack = createStackNavigator();
const PlacesStack = createStackNavigator();

const PlaceStackScreen = ({ route }) => {
    const { info } = route.params;

    return (
        <SafeAreaProvider>
            <PlacesStack.Navigator>
                <MainStack.Screen name="SearchPlace" component={SearchPlaceScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <MainStack.Screen name="EditPlace" component={EditPlaceScreen} options={{ headerShown: false }} initialParams={{ info }} />
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
            <RootStack.Navigator mode="modal">
                <RootStack.Screen name="AccountStack" component={MainStackScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="CreateAccount" component={CreateAccountScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="SavedPlaces" component={SavedPlacesScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="AddNewPlace" component={PlaceStackScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <MainStack.Screen name="EditPlaceForm" component={EditPlaceScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="AddPaymentMethod" component={AddPaymentMethodScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="Order" component={OrderScreen} options={{ headerShown: false }} initialParams={{ info }} />
            </RootStack.Navigator>
        </SafeAreaProvider>
    );
};

export default AccountStack;

export { PlaceStackScreen };
