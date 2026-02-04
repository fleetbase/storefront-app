import React, { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, Pressable, Keyboard, StyleSheet } from 'react-native';
import { Spinner, Button, Text, YStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faArrowRotateRight } from '@fortawesome/free-solid-svg-icons';
import { OtpInput } from 'react-native-otp-entry';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSafeTabBarHeight } from '../hooks/use-safe-tab-bar-height';

const VerifyPhoneScreen = ({ route }) => {
    const navigation = useNavigation();
    const returnTo = route?.params?.returnTo || 'Profile';
    const theme = useTheme();
    const { phone, verifyPhoneNumber, isVerifyingCode } = useAuth();
    const { t } = useLanguage();
    const tabBarHeight = useSafeTabBarHeight();
    const [code, setCode] = useState(null);

    const handleVerifyCode = async (code) => {
        if (isVerifyingCode) {
            return;
        }

        try {
            await verifyPhoneNumber(code);
            toast.success(t('VerifyPhoneScreen.success'));
            // Navigate to the screen specified by returnTo parameter
            navigation.navigate(returnTo);
        } catch (error) {
            toast.error(error?.message ?? t('VerifyPhoneScreen.error'));
        }
    };

    const handleRetry = () => {
        setCode('');
        navigation.goBack();
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} bg='$background' space='$3' pt='$5' px='$5' pb={tabBarHeight}>
                <YStack mb='$4'>
                    <Text fontSize={20} fontWeight='bold' color='$textPrimary'>
                        {t('VerifyPhoneScreen.title', { phone })}
                    </Text>
                    <Text fontSize='$5' color='$textSecondary' mt='$2'>
                        {t('VerifyPhoneScreen.description')}
                    </Text>
                </YStack>
                <OtpInput
                    numberOfDigits={6}
                    onTextChange={setCode}
                    onFilled={handleVerifyCode}
                    focusColor={theme.primary.val}
                    theme={{ pinCodeContainerStyle: { borderColor: theme['blue-300'].val, height: 50, width: 50 }, pinCodeTextStyle: { color: theme.primary.val, fontSize: 25 } }}
                />
                <Button size='$5' onPress={() => handleVerifyCode(code)} bg='$primary' width='100%' opacity={isVerifyingCode ? 0.75 : 1} disabled={isVerifyingCode} rounded='true'>
                    <Button.Icon>{isVerifyingCode ? <Spinner color='$white' /> : <FontAwesomeIcon icon={faCheck} color={theme.white.val} />}</Button.Icon>
                    <Button.Text color='$white' fontWeight='bold'>
                        {t('VerifyPhoneScreen.verify')}
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
        </SafeAreaView>
    );
};

export default VerifyPhoneScreen;
