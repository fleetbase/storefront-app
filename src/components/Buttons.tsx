import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { Button } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faFacebook, faInstagram, faGoogle, faApple } from '@fortawesome/free-brands-svg-icons';
import { faPhone } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';

export const PhoneLoginButton = ({ onPress }) => {
    const theme = useTheme();
    const { t } = useLanguage();

    return (
        <Button onPress={onPress} bg='$secondary' width='100%' rounded='true'>
            <Button.Icon>
                <FontAwesomeIcon icon={faPhone} color={theme['$textPrimary'].val} />
            </Button.Icon>
            <Button.Text color='$textPrimary'>{t('Buttons.continueWithPhone')}</Button.Text>
        </Button>
    );
};

export const AppleLoginButton = ({ onPress }) => {
    const theme = useTheme();
    const { t } = useLanguage();

    return (
        <Button onPress={onPress} bg='$white' borderWidth={1} borderColor='$gray-200' width='100%' rounded='true'>
            <Button.Icon>
                <FontAwesomeIcon icon={faApple} color={theme['$gray-900'].val} />
            </Button.Icon>
            <Button.Text color='$gray-900'>{t('Buttons.continueWithApple')}</Button.Text>
        </Button>
    );
};

export const FacebookLoginButton = ({ onPress }) => {
    const theme = useTheme();
    const { t } = useLanguage();

    return (
        <Button onPress={onPress} bg='$blue-600' borderWidth={1} borderColor='$blue-800' width='100%' rounded='true'>
            <Button.Icon>
                <FontAwesomeIcon icon={faFacebook} color={theme['$blue-100'].val} />
            </Button.Icon>
            <Button.Text color='$blue-100'>{t('Buttons.continueWithFacebook')}</Button.Text>
        </Button>
    );
};

export const InstagramLoginButton = ({ onPress }) => {
    const theme = useTheme();
    const { t } = useLanguage();

    return (
        <LinearGradient colors={['#feda75', '#fa7e1e', '#d62976', '#962fbf', '#4f5bd5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: '100%', borderRadius: 8 }}>
            <Button onPress={onPress} bg='transparent' width='100%' rounded='true'>
                <Button.Icon>
                    <FontAwesomeIcon icon={faInstagram} color={theme['$white'].val} />
                </Button.Icon>
                <Button.Text color='$white'>{t('Buttons.continueWithInstagram')}</Button.Text>
            </Button>
        </LinearGradient>
    );
};

export const GoogleLoginButton = ({ onPress }) => {
    const { t } = useLanguage();

    return (
        <Button onPress={onPress} bg='#4285F4' width='100%' rounded='true'>
            <Button.Icon>
                <FontAwesomeIcon icon={faGoogle} color='white' />
            </Button.Icon>
            <Button.Text color='$white'>{t('Buttons.continueWithGoogle')}</Button.Text>
        </Button>
    );
};
