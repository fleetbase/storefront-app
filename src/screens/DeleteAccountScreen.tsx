import React, { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { YStack, Text, Button, Image, Spinner } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const DeleteAccountScreen = () => {
    const navigation = useNavigation();
    const { deleteAccount } = useAuth();
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);

    const handleDeleteAccount = useCallback(async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            await deleteAccount();
            navigation.navigate('DeleteAccountVerify');
        } catch (error) {
            console.warning('Error sending deletion verification code:', error);
        } finally {
            setIsLoading(false);
        }
    }, [deleteAccount]);

    const handleCancel = () => {
        navigation.goBack();
    };

    return (
        <YStack flex={1} bg='$background' alignItems='center' justifyContent='center' padding='$6'>
            <YStack alignItems='center' marginBottom='$6'>
                {/* <FontAwesomeIcon icon={faExclamationTriangle} size={50} color='#FF0000' /> */}
                <YStack alignItems='center' justifyContent='center'>
                    <Image source={require('../../assets/images/close-account.png')} width={360} height={360} borderRadius={360} resizeMode='contain' />
                </YStack>
                <Text fontSize='$8' fontWeight='bold' color='$textPrimary' textAlign='center' marginTop='$3'>
                    {t('DeleteAccountScreen.deleteAccount')}
                </Text>
                <Text color='$textSecondary' fontSize='$4' textAlign='center' marginTop='$2'>
                    {t('DeleteAccountScreen.deleteAccountConfirmation')}
                </Text>
            </YStack>
            <YStack space='$3' width='100%'>
                <Button size='$5' bg='$error' color='$errorText' borderWidth={1} borderColor='$errorBorder' width='100%' onPress={handleDeleteAccount} disabled={isLoading} rounded='true'>
                    {isLoading && (
                        <Button.Icon>
                            <Spinner />
                        </Button.Icon>
                    )}
                    <Button.Text>{isLoading ? t('DeleteAccountScreen.processingRequest') : t('DeleteAccountScreen.deleteMyAccount')}</Button.Text>
                </Button>
                <Button size='$5' bg='$secondary' color='$textPrimary' borderWidth={1} borderColor='$borderColor' width='100%' onPress={handleCancel} rounded='true'>
                    {t('DeleteAccountScreen.cancel')}
                </Button>
            </YStack>
        </YStack>
    );
};

export default DeleteAccountScreen;
