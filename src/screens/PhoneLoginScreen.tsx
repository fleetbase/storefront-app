import React, { useEffect, useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, Pressable, Keyboard, StyleSheet, Platform } from 'react-native';
import { Spinner, Input, Stack, Text, YStack, useTheme, Button } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane, faKey, faArrowRight, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { isValidPhoneNumber } from '../utils';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import PhoneInput from '../components/PhoneInput';
import AbsoluteTabBarScreenWrapper from '../components/AbsoluteTabBarScreenWrapper';
import ScreenWrapper from '../components/ScreenWrapper';

const isAndroid = Platform.OS === 'android';
const PhoneLoginScreen = () => {
    const navigation = useNavigation();
    const theme = useTheme();
    const { login, isSendingCode, phone: phoneState } = useAuth();
    const { t } = useLanguage();
    const [phone, setPhone] = useState(phoneState);

    const handleSendVerificationCode = async () => {
        if (isSendingCode) {
            return;
        }

        if (!isValidPhoneNumber(phone)) {
            return toast.error(t('PhoneLoginScreen.invalidPhone'));
        }

        try {
            await login(phone);
            navigation.navigate('PhoneLoginVerify');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleUseAnotherMethod = () => {
        navigation.goBack();
    };

    const handleCreateAccount = () => {
        navigation.navigate('CreateAccount');
    };

    return (
        <ScreenWrapper>
            <AbsoluteTabBarScreenWrapper>
                <YStack flex={1} alignItems='center' bg='$background' space='$3'>
                    <YStack space='$2' width='100%' px='$5' pt='$5'>
                        <Text color='$textPrimary' fontWeight='bold' fontSize='$8' mb='$3'>
                            {t('PhoneLoginScreen.loginViaSms')}
                        </Text>
                        <PhoneInput value={phone} onChange={(phoneNumber) => setPhone(phoneNumber)} />
                        <Button size='$5' onPress={handleSendVerificationCode} bg='$primary' width='100%' opacity={isSendingCode ? 0.75 : 1} disabled={isSendingCode} rounded='true'>
                            <Button.Icon>{isSendingCode ? <Spinner color='$white' /> : <FontAwesomeIcon icon={faPaperPlane} color='white' />}</Button.Icon>
                            <Button.Text color='$white' fontWeight='bold'>
                                {t('PhoneLoginScreen.sendVerificationCode')}
                            </Button.Text>
                        </Button>
                    </YStack>
                    <YStack flex={1} position='relative' width='100%'>
                        <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} pointerEvents='box-only' />
                    </YStack>
                    <YStack space='$4' width='100%' px='$4' pb={0}>
                        <Button size='$5' onPress={handleUseAnotherMethod} bg='$secondary' width='100%' rounded='true'>
                            <Button.Icon>
                                <FontAwesomeIcon icon={faArrowLeft} color={theme.textPrimary.val} />
                            </Button.Icon>
                            <Button.Text color='$textPrimary' fontWeight='bold'>
                                {t('PhoneLoginScreen.loginUsingAnotherMethod')}
                            </Button.Text>
                        </Button>
                        <Button size='$5' onPress={handleCreateAccount} bg='$indigo-600' width='100%' rounded='true'>
                            <Button.Text color='$white' fontWeight='bold'>
                                {t('PhoneLoginScreen.createNewAccount')}
                            </Button.Text>
                            <Button.Icon>
                                <FontAwesomeIcon icon={faArrowRight} color='white' />
                            </Button.Icon>
                        </Button>
                    </YStack>
                </YStack>
            </AbsoluteTabBarScreenWrapper>
        </ScreenWrapper>
    );
};

export default PhoneLoginScreen;
