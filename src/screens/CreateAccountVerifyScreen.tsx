import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { Spinner, Button, Input, Stack, Text, YStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faArrowRotateRight } from '@fortawesome/free-solid-svg-icons';
import { OtpInput } from 'react-native-otp-entry';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const CreateAccountVerifyScreen = ({ route }) => {
    const navigation = useNavigation();
    const theme = useTheme();
    const { phone, verifyAccountCreation, isVerifyingCode } = useAuth();
    const { t } = useLanguage();
    const [code, setCode] = useState(null);
    const name = route.params.name;

    const handleVerifyCode = async (code) => {
        if (isVerifyingCode) {
            return;
        }

        try {
            await verifyAccountCreation(phone, code, { name, phone });
        } catch (error) {
            toast.error(error?.message ?? 'Code verification failed.');
        }
    };

    const handleRetry = () => {
        setCode('');
        navigation.navigate('CreateAccount', { phone, name });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} bg='$background' space='$3' padding='$5'>
                <YStack mb='$4'>
                    <Text fontSize={20} fontWeight='bold'>
                        {t('CreateAccountVerifyScreen.codeSent', { phone })}
                    </Text>
                </YStack>
                <OtpInput
                    numberOfDigits={6}
                    onTextChange={setCode}
                    onFilled={handleVerifyCode}
                    focusColor={theme.primary.val}
                    theme={{ pinCodeContainerStyle: { borderColor: theme['blue-300'].val, height: 50, width: 50 }, pinCodeTextStyle: { color: theme.primary.val, fontSize: 25 } }}
                />
                <Button onPress={() => handleVerifyCode(code)} bg='$primary' width='100%' opacity={isVerifyingCode ? 0.75 : 1} disabled={isVerifyingCode} rounded='true'>
                    <Button.Icon>{isVerifyingCode ? <Spinner color='$white' /> : <FontAwesomeIcon icon={faCheck} color={theme.white.val} />}</Button.Icon>
                    <Button.Text color='$white' fontWeight='bold'>
                        {t('CreateAccountVerifyScreen.verifyCode')}
                    </Button.Text>
                </Button>
                <Button onPress={handleRetry} bg='$secondary' width='100%' rounded='true'>
                    <Button.Icon>
                        <FontAwesomeIcon icon={faArrowRotateRight} color={theme['gray-500'].val} />
                    </Button.Icon>
                    <Button.Text color='$gray-500' fontWeight='bold'>
                        {t('common.retry')}
                    </Button.Text>
                </Button>
            </YStack>
        </SafeAreaView>
    );
};

export default CreateAccountVerifyScreen;
