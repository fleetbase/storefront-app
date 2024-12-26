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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} alignItems='center' bg='$background' space='$3' padding='$5'>
                <YStack flex={1} space='$2' width='100%'>
                    <Text color='$textPrimary' fontWeight='bold' fontSize='$8' mb='$3'>
                        Create Account
                    </Text>
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
                </YStack>

                <YStack space='$3' width='100%'>
                    <Button onPress={handleSendVerificationCode} bg='$primary' width='100%' opacity={isSendingCode ? 0.75 : 1} disabled={isSendingCode} rounded>
                        <Button.Icon>{isSendingCode ? <Spinner color='$white' /> : <FontAwesomeIcon icon={faPaperPlane} color={theme.white.val} />}</Button.Icon>
                        <Button.Text color='$white' fontWeight='bold'>
                            Send Verification Code
                        </Button.Text>
                    </Button>
                </YStack>
            </YStack>
        </SafeAreaView>
    );
};

export default CreateAccountScreen;
