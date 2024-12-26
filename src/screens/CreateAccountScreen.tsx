import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { Spinner, Input, XStack, Text, YStack, useTheme, Button } from 'tamagui';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane, faKey, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { isValidPhoneNumber } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import PhoneInput from '../components/PhoneInput';
import BackButton from '../components/BackButton';

const CreateAccountScreen = ({ route }) => {
    const params = route.params || {};
    const navigation = useNavigation();
    const theme = useTheme();
    const { requestCreationCode, isSendingCode, phone: phoneState } = useAuth();
    const [phone, setPhone] = useState(phoneState);
    const [name, setName] = useState(params.name);

    const handleSendVerificationCode = async () => {
        if (isSendingCode) {
            return;
        }

        if (!isValidPhoneNumber(phone)) {
            return toast.error('Invalid phone number provided.');
        }

        try {
            await requestCreationCode(phone);
            navigation.navigate('CreateAccountVerify', { name, phone });
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleLogin = () => {
        navigation.navigate('Login');
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} alignItems='center' bg='$background' space='$3' padding='$5'>
                <YStack flex={1} space='$2' width='100%'>
                    <XStack space='$3' alignItems='center' mb='$3'>
                        <BackButton size={40} />
                        <Text color='$textPrimary' fontWeight='bold' fontSize='$8'>
                            Create Account
                        </Text>
                    </XStack>
                    <YStack height={43} width='100%'>
                        <Input
                            value={name}
                            onChangeText={(text) => setName(text)}
                            size='$5'
                            placeholder={name}
                            color='$color'
                            shadowOpacity={0}
                            shadowRadius={0}
                            borderWidth={1}
                            borderColor='$borderColorWithShadow'
                            borderRadius='$4'
                            bg='white'
                            flex={1}
                            autoCapitalize={false}
                            autoComplete={false}
                            autoCorrect={false}
                            placeholder='Enter your name'
                        />
                    </YStack>
                    <PhoneInput value={phone} onChange={(phoneNumber) => setPhone(phoneNumber)} />
                    <Button onPress={handleSendVerificationCode} bg='$primary' width='100%' opacity={isSendingCode ? 0.75 : 1} disabled={isSendingCode} rounded>
                        <Button.Icon>{isSendingCode ? <Spinner color='$white' /> : <FontAwesomeIcon icon={faPaperPlane} color={theme.white.val} />}</Button.Icon>
                        <Button.Text color='$white' fontWeight='bold'>
                            Send Verification Code
                        </Button.Text>
                    </Button>
                </YStack>

                <YStack space='$3' width='100%'>
                    <Button onPress={handleLogin} bg='$secondary' width='100%' opacity={isSendingCode ? 0.75 : 1} disabled={isSendingCode} rounded>
                        <Button.Text color='$textPrimary' fontWeight='bold'>
                            Have an account already? Login
                        </Button.Text>
                    </Button>
                </YStack>
            </YStack>
        </SafeAreaView>
    );
};

export default CreateAccountScreen;
