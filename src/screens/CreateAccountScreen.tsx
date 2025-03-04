import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, Pressable, Keyboard, StyleSheet, Platform } from 'react-native';
import { Spinner, XStack, Text, YStack, useTheme, Button } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane, faKey, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { isValidPhoneNumber } from '../utils';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import PhoneInput from '../components/PhoneInput';
import BackButton from '../components/BackButton';
import Input from '../components/Input';
import AbsoluteTabBarScreenWrapper from '../components/AbsoluteTabBarScreenWrapper';

const isAndroid = Platform.OS === 'android';
const CreateAccountScreen = ({ route }) => {
    const params = route.params || {};
    const navigation = useNavigation();
    const theme = useTheme();
    const { t } = useLanguage();
    const { requestCreationCode, isSendingCode, phone: phoneState } = useAuth();
    const [phone, setPhone] = useState(phoneState);
    const [name, setName] = useState(params.name);

    const handleSendVerificationCode = async () => {
        if (isSendingCode) {
            return;
        }

        if (!isValidPhoneNumber(phone)) {
            return toast.error(t('CreateAccountScreen.invalidPhone'));
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
            <AbsoluteTabBarScreenWrapper>
                <YStack flex={1} alignItems='center' bg='$background' space='$3'>
                    <YStack width='100%' padding='$5'>
                        <XStack space='$3' alignItems='center' mb='$5'>
                            <BackButton size={40} />
                            <Text color='$textPrimary' fontWeight='bold' fontSize='$8'>
                                {t('CreateAccountScreen.createAccount')}
                            </Text>
                        </XStack>
                        <YStack space='$3'>
                            <Input value={name} onChangeText={(text) => setName(text)} placeholder={t('CreateAccountScreen.enterYourName')} />
                            <PhoneInput value={phone} onChange={(phoneNumber) => setPhone(phoneNumber)} />
                        </YStack>
                        <Button size='$5' mt='$2' onPress={handleSendVerificationCode} bg='$primary' width='100%' opacity={isSendingCode ? 0.75 : 1} disabled={isSendingCode} rounded='true'>
                            <Button.Icon>{isSendingCode ? <Spinner color='$white' /> : <FontAwesomeIcon icon={faPaperPlane} color={theme.white.val} />}</Button.Icon>
                            <Button.Text color='$white' fontWeight='bold'>
                                {t('CreateAccountScreen.sendVerificationCode')}
                            </Button.Text>
                        </Button>
                    </YStack>
                    <YStack flex={1} position='relative' width='100%'>
                        <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} pointerEvents='box-only' />
                    </YStack>
                    <YStack space='$3' width='100%' px='$4' pb={isAndroid ? '$4' : 0}>
                        <Button size='$5' onPress={handleLogin} bg='$secondary' width='100%' opacity={isSendingCode ? 0.75 : 1} disabled={isSendingCode} rounded='true'>
                            <Button.Text color='$textPrimary' fontWeight='bold'>
                                {t('CreateAccountScreen.haveAccountAlreadyLogin')}
                            </Button.Text>
                        </Button>
                    </YStack>
                </YStack>
            </AbsoluteTabBarScreenWrapper>
        </SafeAreaView>
    );
};

export default CreateAccountScreen;
