import React from 'react';
import { Pressable, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faShoppingCart } from '@fortawesome/free-solid-svg-icons';
import { Button, YStack, XStack, Text, useTheme } from 'tamagui';
import { BlurView } from '@react-native-community/blur';
import { showActionSheet } from '../utils';
import { toast } from '../utils/toast';
import { useLanguage } from '../contexts/LanguageContext';
import useAppTheme from '../hooks/use-app-theme';

const LocaleButton = ({ iconSize = 18, blur = false, style = {}, onPress, ...props }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { isDarkMode } = useAppTheme();
    const { languages, language, setLocale, t } = useLanguage();

    const handleLanguageSelect = () => {
        const options = [...languages.map((lang) => lang.native), t('common.cancel')];
        showActionSheet({
            options,
            cancelButtonIndex: options.length - 1,
            onSelect: (buttonIndex) => {
                if (buttonIndex !== options.length - 1) {
                    const selectedLanguage = languages[buttonIndex];
                    setLocale(selectedLanguage.code);
                    toast.success(t('AccountScreen.languageChanged', { selectedLanguage: selectedLanguage.native }));
                }
            },
        });
    };

    return (
        <YStack position='relative'>
            <Pressable onPress={handleLanguageSelect}>
                <YStack
                    style={[
                        style,
                        {
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: theme.borderColorWithShadow.val,
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                            overflow: 'hidden',
                            backgroundColor: Platform.OS === 'android' ? theme.background.val : 'transparent',
                        },
                    ]}
                    {...props}
                >
                    <XStack justifyContent='center' alignItems='center' bg='transparent' space='$2' zIndex={2}>
                        <Text>{language.emoji}</Text>
                        <Text>{language.native}</Text>
                    </XStack>
                    {blur && Platform.OS !== 'android' && (
                        <BlurView
                            style={StyleSheet.absoluteFillObject}
                            blurType={isDarkMode ? 'dark' : 'light'}
                            blurAmount={10}
                            borderRadius={20}
                            reducedTransparencyFallbackColor='rgba(255, 255, 255, 0.8)'
                        />
                    )}
                </YStack>
            </Pressable>
        </YStack>
    );
};

export default LocaleButton;
