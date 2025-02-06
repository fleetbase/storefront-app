import React from 'react';
import Config from 'react-native-config';
import { SafeAreaView } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faExclamationTriangle, faExclamation } from '@fortawesome/free-solid-svg-icons';
import { translate } from '../utils/localize';
import { Stack, YStack, XStack, Text, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';

const keyMissing = (key: string) => !Config[key];

const SetupWarningScreen = ({ error }: { error?: Error }) => {
    const { t } = useLanguage();
    const theme = useTheme();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <YStack flex={1} alignItems='center' justifyContent='center' bg='white' px='$5'>
                <Stack alignItems='center' justifyContent='center' mb='$4'>
                    <YStack alignItems='center' justifyContent='center' bg='$yellow-100' borderRadius={999} width={225} height={225} mb='$4'>
                        <FontAwesomeIcon icon={faExclamationTriangle} size={88} color={theme['$yellow-600'].val} />
                    </YStack>
                    <Text fontSize='$8' fontWeight='bold' color='$gray-900' textAlign='center' mb='$2'>
                        {t('SetupWarningScreen.configurationMissing')}
                    </Text>
                    <Text fontSize='$5' color='$gray-700' fontWeight='600' textAlign='center' maxWidth={240}>
                        {t('SetupWarningScreen.unconfiguredApp')}
                    </Text>
                </Stack>

                <YStack width='100%'>
                    {keyMissing('FLEETBASE_KEY') && (
                        <XStack alignItems='center' bg='$red1' borderRadius='$2' px='$3' py='$2' mb='$2'>
                            <FontAwesomeIcon icon={faExclamation} size={12} color='#7F1D1D' style={{ marginRight: 8 }} />
                            <Text color='$red900' fontWeight='bold'>
                                {t('common.fleetbase')} {t('common.apiKey')}
                            </Text>
                            <Text color='$red900' fontWeight='500' ml='$1'>
                                {t('SetupWarningScreen.envMissing')}
                            </Text>
                        </XStack>
                    )}
                    {keyMissing('STOREFRONT_KEY') && (
                        <XStack alignItems='center' bg='$red1' borderRadius='$2' px='$3' py='$2'>
                            <FontAwesomeIcon icon={faExclamation} size={12} color='#7F1D1D' style={{ marginRight: 8 }} />
                            <Text color='$red900' fontWeight='bold'>
                                {t('common.storefront')} {t('common.apiKey')}
                            </Text>
                            <Text color='$red900' fontWeight='500' ml='$1'>
                                {t('SetupWarningScreen.envMissing')}
                            </Text>
                        </XStack>
                    )}
                    {error && (
                        <XStack alignSelf='center' alignItems='center' justifyContent='center' bg='$red-100' borderWidth={1} borderColor='$red-400' borderRadius='$4' px='$4' py='$2' mt='$2'>
                            <Text color='$red-700' fontWeight='600' fontSize={14}>
                                {error.message}
                            </Text>
                        </XStack>
                    )}
                </YStack>
            </YStack>
        </SafeAreaView>
    );
};

export default SetupWarningScreen;
