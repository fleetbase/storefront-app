import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AccountScreen from './screens/AccountScreen';
import LoginScreen from 'auth/screens/LoginScreen';
import CreateAccountScreen from 'auth/screens/CreateAccountScreen';

const RootStack = createStackNavigator();

const AuthStack = ({ route }) => {
    const { info } = route.params;

    return (
        <SafeAreaProvider>
            <RootStack.Navigator mode="modal">
                <RootStack.Screen name="AccountScreen" component={AccountScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} initialParams={{ info }} />
                <RootStack.Screen name="CreateAccount" component={CreateAccountScreen} options={{ headerShown: false }} initialParams={{ info }} />
            </RootStack.Navigator>
        </SafeAreaProvider>
    );
};

export default AuthStack;
