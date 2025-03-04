import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, Pressable, Keyboard, StyleSheet } from 'react-native';
import { Spinner, Button, Text, YStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faArrowRotateRight } from '@fortawesome/free-solid-svg-icons';
import { OtpInput } from 'react-native-otp-entry';
import { toast } from '../utils/toast';
import AbsoluteTabBarScreenWrapper from '../components/AbsoluteTabBarScreenWrapper';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const DeleteAccountVerifyScreen = () => {
    const navigation = useNavigation();
    const theme = useTheme();
    const { verifyAccountDeletion } = useAuth();
    const { t } = useLanguage();
    const [code, setCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const handleVerifyCode = async (enteredCode: string) => {
        if (isVerifying) return;
        setIsVerifying(true);
        try {
            await verifyAccountDeletion(enteredCode);
            toast.success(t('DeleteAccountVerifyScreen.accountDeleted'));
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleRetry = () => {
        navigation.goBack();
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <AbsoluteTabBarScreenWrapper>
                <YStack flex={1} bg='$background' space='$3' padding='$5'>
                    <YStack mb='$4' space='$1'>
                        <Text fontSize={20} fontWeight='bold'>
                            {t('DeleteAccountVerifyScreen.enterDeletionCode')}
                        </Text>
                        <Text fontSize='$4' color='$textSecondary'>
                            {t('DeleteAccountVerifyScreen.deletionCodePrompt')}
                        </Text>
                    </YStack>
                    <OtpInput
                        numberOfDigits={6}
                        onTextChange={setCode}
                        onFilled={handleVerifyCode}
                        focusColor={theme.primary.val}
                        theme={{
                            pinCodeContainerStyle: { borderColor: theme['blue-300'].val, height: 50, width: 50 },
                            pinCodeTextStyle: { color: theme.primary.val, fontSize: 25 },
                        }}
                    />
                    <Button size='$5' onPress={() => handleVerifyCode(code)} bg='$primary' width='100%' opacity={isVerifying ? 0.75 : 1} disabled={isVerifying} rounded='true'>
                        <Button.Icon>{isVerifying ? <Spinner color='$white' /> : <FontAwesomeIcon icon={faCheck} color={theme.white.val} />}</Button.Icon>
                        <Button.Text color='$white' fontWeight='bold'>
                            {t('DeleteAccountVerifyScreen.verifyCode')}
                        </Button.Text>
                    </Button>
                    <Button size='$5' onPress={handleRetry} bg='$secondary' width='100%' rounded='true'>
                        <Button.Icon>
                            <FontAwesomeIcon icon={faArrowRotateRight} color={theme['gray-500'].val} />
                        </Button.Icon>
                        <Button.Text color='$textPrimary' fontWeight='bold'>
                            {t('common.retry')}
                        </Button.Text>
                    </Button>
                </YStack>
                <YStack flex={1} position='relative' width='100%'>
                    <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} pointerEvents='box-only' />
                </YStack>
            </AbsoluteTabBarScreenWrapper>
        </SafeAreaView>
    );
};

export default DeleteAccountVerifyScreen;
