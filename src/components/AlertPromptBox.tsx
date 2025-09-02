import { Alert } from 'react-native';
import { View, Text, Button, YStack, XStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTriangleExclamation, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../contexts/LanguageContext';

interface AlertPromptBoxProps {
    show: boolean;
    prompt: string;
    promptTitle: string;
    onConfirm: () => void;
    confirmButtonText: string;
    confirmTitle: string;
    confirmMessage: string;
    colorScheme: string;
}

const AlertPromptBox: React.FC<AlertPromptBoxProps> = ({
    show = false,
    prompt,
    promptTitle,
    onConfirm,
    confirmButtonText,
    confirmAlertButtonText,
    confirmTitle,
    confirmMessage,
    colorScheme = 'blue',
    ...props
}) => {
    const { t } = useLanguage();
    const theme = useTheme();
    confirmButtonText = confirmButtonText ?? t('common.confirm');
    confirmAlertButtonText = confirmAlertButtonText ?? t('common.ok');
    confirmTitle = confirmTitle ?? t('common.confirmation');
    confirmMessage = confirmMessage ?? t('AlertPromptBox.proceedPrompt');

    const handlePress = () => {
        Alert.alert(confirmTitle, confirmMessage, [
            { text: t('common.cancel'), style: 'cancel' },
            { text: confirmAlertButtonText, onPress: () => onConfirm() },
        ]);
    };

    if (!show) {
        return <YStack height={0} />;
    }

    return (
        <YStack
            alignItems='start'
            justifyContent='center'
            bg={`$${colorScheme}-900`}
            borderWidth={1}
            borderColor={`$${colorScheme}-600`}
            px='$4'
            py='$3'
            borderRadius='$4'
            shadowColor={`$${colorScheme}-400`}
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.2}
            shadowRadius={4}
            width='100%'
            {...props}
        >
            <XStack>
                <YStack pt='$1' pr='$4'>
                    <FontAwesomeIcon icon={faTriangleExclamation} color={theme[`$${colorScheme}-100`].val} size={30} />
                </YStack>
                <YStack flex={1} flexShrink={1} maxWidth='85%'>
                    {promptTitle && (
                        <Text color={`$${colorScheme}-100`} fontSize='$6' fontWeight='bold' mb='$2'>
                            {promptTitle}
                        </Text>
                    )}
                    <Text color={`$${colorScheme}-100`} fontSize='$5'>
                        {prompt}
                    </Text>
                </YStack>
            </XStack>
            <XStack mt='$3'>
                <Button onPress={handlePress} bg={`$${colorScheme}-800`} color={`$${colorScheme}-100`} px='$4' py='$1'>
                    <Button.Icon>
                        <FontAwesomeIcon icon={faCheck} color={theme[`$${colorScheme}-100`].val} size={15} />
                    </Button.Icon>
                    <Button.Text>{confirmButtonText}</Button.Text>
                </Button>
            </XStack>
        </YStack>
    );
};

export default AlertPromptBox;
