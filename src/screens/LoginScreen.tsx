import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, ImageBackground, StyleSheet } from 'react-native';
import { Spinner, Stack, Text, YStack, useTheme, Button } from 'tamagui';
import { toast } from '../utils/toast';
import { titleize } from '../utils/format';
import { storefrontConfig } from '../utils';
import { useLanguage } from '../contexts/LanguageContext';
import { PhoneLoginButton, AppleLoginButton, FacebookLoginButton, GoogleLoginButton } from '../components/Buttons';
import useOAuth from '../hooks/use-oauth';
import LinearGradient from 'react-native-linear-gradient';
import AbsoluteTabBarScreenWrapper from '../components/AbsoluteTabBarScreenWrapper';
import storage from '../utils/storage';

const SHOW_CLEAR_CACHE = false;
const LoginScreen = () => {
    const navigation = useNavigation();
    const theme = useTheme();
    const { login, loginSupported, loading } = useOAuth();
    const { t } = useLanguage();

    const handleClearCache = () => {
        storage.clearStore();
        toast.success(t('LoginScreen.cacheCleared'));
    };

    const handlePhoneLogin = () => {
        navigation.navigate('PhoneLogin');
    };

    const handleOAuthLogin = async (provider) => {
        try {
            const response = await login(provider);
            toast.success(t('LoginScreen.loggedInWithProvider', { provider: titleize(provider) }));
        } catch (err) {
            toast.warning(t('LoginScreen.loginAttemptFailed', { provider: titleize(provider) }));
            console.error('Error attempting OAuth login:', err);
        }
    };

    return (
        <ImageBackground source={storefrontConfig('backgroundImages.LoginScreen')} style={[styles.background, { backgroundColor: theme.background.val }]} resizeMode='cover'>
            <LinearGradient colors={['rgba(0, 0, 0, 0.0)', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.8)']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
            <AbsoluteTabBarScreenWrapper>
                <SafeAreaView style={{ flex: 1 }}>
                    <YStack flex={1} justifyContent='flex-end' alignItems='center' space='$3' padding='$4'>
                        <PhoneLoginButton onPress={handlePhoneLogin} />
                        {loginSupported('apple') && <AppleLoginButton onPress={() => handleOAuthLogin('apple')} />}
                        {loginSupported('facebook') && <FacebookLoginButton onPress={() => handleOAuthLogin('facebook')} />}
                        {loginSupported('google') && <GoogleLoginButton onPress={() => handleOAuthLogin('google')} />}
                        {SHOW_CLEAR_CACHE && (
                            <Button bg='$error' borderColor='$errorBorder' borderWidth={1} onPress={handleClearCache} rounded='true' width='100%'>
                                <Button.Text color='$errorText'>{t('LoginScreen.clearCache')}</Button.Text>
                            </Button>
                        )}
                    </YStack>
                </SafeAreaView>
                {loading && (
                    <YStack justifyContent='center' alignItems='center' bg='rgba(0, 0, 0, 0.6)' position='absolute' top={0} bottom={0} left={0} right={0}>
                        <Spinner size='large' color='white' />
                    </YStack>
                )}
            </AbsoluteTabBarScreenWrapper>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
});

export default LoginScreen;
