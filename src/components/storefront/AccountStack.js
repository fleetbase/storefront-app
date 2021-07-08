import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import StorefrontAccountScreen from './AccountScreen';
import StorefrontLoginScreen from './LoginScreen';
import StorefrontCreateAccountScreen from './CreateAccountScreen';
import StorefrontEditProfileScreen from './EditProfileScreen';
import StorefrontAddressBookScreen from './AddressBookScreen';
import StorefrontPaymentMethodsScreen from './PaymentMethodsScreen';
import StorefrontOrderHistoryScreen from './OrderHistoryScreen';
import StorefrontChangePasswordScreen from './ChangePasswordScreen';

const MainStack = createStackNavigator();
const RootStack = createStackNavigator();

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
        <RootStack.Navigator mode="modal">
            <RootStack.Screen name="AccountStack" component={MainStackScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
            <RootStack.Screen name="Login" component={StorefrontLoginScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
            <RootStack.Screen name="CreateAccount" component={StorefrontCreateAccountScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
            <RootStack.Screen name="EditProfile" component={StorefrontEditProfileScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
            <RootStack.Screen name="AddressBook" component={StorefrontAddressBookScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
            <RootStack.Screen name="PaymentMethods" component={StorefrontPaymentMethodsScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
            <RootStack.Screen name="OrderHistory" component={StorefrontOrderHistoryScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
            <RootStack.Screen name="ChangePassword" component={StorefrontChangePasswordScreen} options={{ headerShown: false }} initialParams={{ info, key }} />
        </RootStack.Navigator>
    );
};

export default AccountStack;
