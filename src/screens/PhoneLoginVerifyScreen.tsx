import React, { useEffect, useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, Pressable, Keyboard, StyleSheet } from 'react-native';
import { Spinner, Button, Input, Stack, Text, YStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faArrowRotateRight } from '@fortawesome/free-solid-svg-icons';
import { OtpInput } from 'react-native-otp-entry';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import AbsoluteTabBarScreenWrapper from '../components/AbsoluteTabBarScreenWrapper';

const PhoneLoginVerifyScreen = () => {
    const navigation = useNavigation();
    const theme = useTheme();
    const { phone, verifyCode, isVerifyingCode } = useAuth();
    const { t } = useLanguage();
    const [code, setCode] = useState(null);

    const handleVerifyCode = async (code) => {
        if (isVerifyingCode) {
            return;
        }

        try {
            await verifyCode(code);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleRetry = () => {
        setCode('');
        navigation.navigate('PhoneLogin', { phone });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <AbsoluteTabBarScreenWrapper>
                <YStack flex={1} bg='$background' space='$3' padding='$5'>
                    <YStack mb='$4'>
                        <Text fontSize={20} fontWeight='bold'>
                            {t('PhoneLoginVerifyScreen.codeSentTo', { phone })}
                        </Text>
                    </YStack>
                    <OtpInput
                        numberOfDigits={6}
                        onTextChange={setCode}
                        onFilled={handleVerifyCode}
                        focusColor={theme.primary.val}
                        theme={{ pinCodeContainerStyle: { borderColor: theme['blue-300'].val, height: 50, width: 50 }, pinCodeTextStyle: { color: theme.primary.val, fontSize: 25 } }}
                    />
                    <Button size='$5' onPress={() => handleVerifyCode(code)} bg='$primary' width='100%' opacity={isVerifyingCode ? 0.75 : 1} disabled={isVerifyingCode} rounded>
                        <Button.Icon>{isVerifyingCode ? <Spinner color='$white' /> : <FontAwesomeIcon icon={faCheck} color={theme.white.val} />}</Button.Icon>
                        <Button.Text color='$white' fontWeight='bold'>
                            {t('PhoneLoginVerifyScreen.verifyCode')}
                        </Button.Text>
                    </Button>
                    <Button size='$5' onPress={handleRetry} bg='$secondary' width='100%' rounded>
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

export default PhoneLoginVerifyScreen;
