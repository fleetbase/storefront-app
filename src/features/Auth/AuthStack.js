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
            <RootStack.Navigator screenOptions={{ presentation: 'modal', headerShown: false }}>
                <RootStack.Screen name="AccountScreen" component={AccountScreen} initialParams={{ info }} />
                <RootStack.Screen name="Login" component={LoginScreen} initialParams={{ info }} />
                <RootStack.Screen name="CreateAccount" component={CreateAccountScreen} initialParams={{ info }} />
            </RootStack.Navigator>
        </SafeAreaProvider>
    );
};

export default AuthStack;
