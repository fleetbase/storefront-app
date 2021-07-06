import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import StorefrontAccountScreen from './AccountScreen';
import StorefrontLoginScreen from './LoginScreen';
import StorefrontCreateAccountScreen from './CreateAccountScreen';

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
        </RootStack.Navigator>
    );
};

export default AccountStack;
