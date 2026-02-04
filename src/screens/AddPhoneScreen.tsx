import React, { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable, Keyboard, StyleSheet, Platform } from 'react-native';
import { Spinner, Button, Text, YStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { isValidPhoneNumber } from '../utils';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import PhoneInput from '../components/PhoneInput';
import ScreenWrapper from '../components/ScreenWrapper';

const AddPhoneScreen = () => {
    const navigation = useNavigation();
    const theme = useTheme();
    const { requestPhoneVerification, isSendingCode, phone: phoneState } = useAuth();
    const { t } = useLanguage();
    const [phone, setPhone] = useState(phoneState || '');

    const handleSendVerificationCode = async () => {
        if (isSendingCode) {
            return;
        }

        if (!isValidPhoneNumber(phone)) {
            return toast.error(t('AddPhoneScreen.invalidPhone'));
        }

        try {
            await requestPhoneVerification(phone);
            navigation.navigate('VerifyPhone');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    return (
        <ScreenWrapper>
            <YStack flex={1} alignItems='center' bg='$background' space='$3'>
                <YStack space='$2' width='100%' px='$5' pt='$5'>
                    <Text color='$textPrimary' fontWeight='bold' fontSize='$8' mb='$3'>
                        {t('AddPhoneScreen.title')}
                    </Text>
                    <Text color='$textSecondary' fontSize='$5' mb='$2'>
                        {t('AddPhoneScreen.description')}
                    </Text>
                    <PhoneInput value={phone} onChange={(phoneNumber) => setPhone(phoneNumber)} />
                    <Button size='$5' onPress={handleSendVerificationCode} bg='$primary' width='100%' opacity={isSendingCode ? 0.75 : 1} disabled={isSendingCode} rounded='true'>
                        <Button.Icon>{isSendingCode ? <Spinner color='$white' /> : <FontAwesomeIcon icon={faPaperPlane} color='white' />}</Button.Icon>
                        <Button.Text color='$white' fontWeight='bold'>
                            {t('AddPhoneScreen.sendCode')}
                        </Button.Text>
                    </Button>
                </YStack>
                <YStack flex={1} position='relative' width='100%'>
                    <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} pointerEvents='box-only' />
                </YStack>
                <YStack space='$4' width='100%' px='$4' pb={0}>
                    <Button size='$5' onPress={handleGoBack} bg='$secondary' width='100%' rounded='true'>
                        <Button.Icon>
                            <FontAwesomeIcon icon={faArrowLeft} color={theme.textPrimary.val} />
                        </Button.Icon>
                        <Button.Text color='$textPrimary' fontWeight='bold'>
                            {t('common.cancel')}
                        </Button.Text>
                    </Button>
                </YStack>
            </YStack>
        </ScreenWrapper>
    );
};

export default AddPhoneScreen;
