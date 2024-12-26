import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { Spinner, Input, Stack, Text, YStack, useTheme, Button } from 'tamagui';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane, faKey, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { isValidPhoneNumber } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import PhoneInput from '../components/PhoneInput';

const PhoneLoginScreen = () => {
    const navigation = useNavigation();
    const theme = useTheme();
    const { login, isSendingCode, phone: phoneState } = useAuth();
    const [phone, setPhone] = useState(phoneState);

    const handleSendVerificationCode = async () => {
        if (isSendingCode) {
            return;
        }

        if (!isValidPhoneNumber(phone)) {
            return toast.error('Invalid phone number provided.');
        }

        try {
            await login(phone);
            navigation.navigate('PhoneLoginVerify');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleUseAnotherMethod = () => {
        navigation.navigate('Login');
    };

    const handleCreateAccount = () => {
        navigation.navigate('CreateAccount');
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} alignItems='center' bg='$background' space='$3' padding='$5'>
                <YStack flex={1} space='$2' width='100%'>
                    <Text color='$textPrimary' fontWeight='bold' fontSize='$8' mb='$3'>
                        Login via SMS
                    </Text>
                    <PhoneInput value={phone} onChange={(phoneNumber) => setPhone(phoneNumber)} />
                    <Button onPress={handleSendVerificationCode} bg='$primary' width='100%' opacity={isSendingCode ? 0.75 : 1} disabled={isSendingCode} rounded>
                        <Button.Icon>{isSendingCode ? <Spinner color='$white' /> : <FontAwesomeIcon icon={faPaperPlane} color={theme.white.val} />}</Button.Icon>
                        <Button.Text color='$white' fontWeight='bold'>
                            Send Verification Code
                        </Button.Text>
                    </Button>
                </YStack>

                <YStack space='$3' width='100%'>
                    <Button onPress={handleUseAnotherMethod} bg='$secondary' width='100%' rounded>
                        <Button.Icon>
                            <FontAwesomeIcon icon={faKey} color={theme['gray-500'].val} />
                        </Button.Icon>
                        <Button.Text color='$gray-500' fontWeight='bold'>
                            Login using Another Method
                        </Button.Text>
                    </Button>
                    <Button onPress={handleCreateAccount} bg='$indigo-600' width='100%' rounded>
                        <Button.Text color='$indigo-100' fontWeight='bold'>
                            Create a new Account
                        </Button.Text>
                        <Button.Icon>
                            <FontAwesomeIcon icon={faArrowRight} color={theme['indigo-100'].val} />
                        </Button.Icon>
                    </Button>
                </YStack>
            </YStack>
        </SafeAreaView>
    );
};

export default PhoneLoginScreen;
