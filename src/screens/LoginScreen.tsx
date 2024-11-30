import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { Stack, Text, YStack, useTheme, Button } from 'tamagui';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import storage from '../utils/storage';

const LoginScreen = () => {
    const navigation = useNavigation();
    const theme = useTheme();

    const handlePhoneLogin = () => {
        navigation.navigate('PhoneLogin');
    };

    const handleClearCache = () => {
        storage.clearStore();
        toast.success('Cache cleared.', { position: ToastPosition.BOTTOM });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} alignItems='center' bg='$background' space='$3' padding='$5'>
                <Button onPress={handlePhoneLogin} bg='$secondary' width='100%' rounded>
                    Continue with Phone
                </Button>
                <Button onPress={handlePhoneLogin} bg='$secondary' width='100%' rounded>
                    Continue with Apple
                </Button>
                <Button onPress={handlePhoneLogin} bg='$secondary' width='100%' rounded>
                    Continue with Facebook
                </Button>
                <Button onPress={handlePhoneLogin} bg='$secondary' width='100%' rounded>
                    Continue with Instagram
                </Button>
                <Button onPress={handlePhoneLogin} bg='$secondary' width='100%' rounded>
                    Continue with Google
                </Button>
                <Button marginTop='$4' bg='$red-900' size='$5' onPress={handleClearCache} rounded width='100%'>
                    <Button.Text color='$red-400' fontWeight='bold'>
                        Clear Cache
                    </Button.Text>
                </Button>
            </YStack>
        </SafeAreaView>
    );
};

export default LoginScreen;
