import React from 'react';
import Config from 'react-native-config';
import { SafeAreaView } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faExclamationTriangle, faExclamation } from '@fortawesome/free-solid-svg-icons';
import { translate } from '../utils/localize';
import { Stack, YStack, XStack, Text } from 'tamagui';
import useLocale from '../hooks/use-locale';

const keyMissing = (key: string) => !Config[key];

const SetupWarningScreen = ({ error }: { error?: Error }) => {
    const [locale] = useLocale();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <YStack flex={1} alignItems='center' justifyContent='center' bg='white' px='$5'>
                <Stack alignItems='center' justifyContent='center' mb='$4'>
                    <YStack alignItems='center' justifyContent='center' bg='$yellow1' borderRadius={100} width={240} height={240} mb='$4'>
                        <FontAwesomeIcon icon={faExclamationTriangle} size={88} color='#D97706' />
                    </YStack>
                    <Text fontSize='$8' fontWeight='bold' color='$gray900' textAlign='center' mb='$2'>
                        {translate('Exceptions.SetupWarningScreen.title')}
                    </Text>
                    <Text fontSize='$5' color='$gray700' fontWeight='600' textAlign='center' maxWidth={240}>
                        {translate('Exceptions.SetupWarningScreen.subtitle')}
                    </Text>
                </Stack>

                <YStack width='100%'>
                    {keyMissing('FLEETBASE_KEY') && (
                        <XStack alignItems='center' bg='$red1' borderRadius='$2' px='$3' py='$2' mb='$2'>
                            <FontAwesomeIcon icon={faExclamation} size={12} color='#7F1D1D' style={{ marginRight: 8 }} />
                            <Text color='$red900' fontWeight='bold'>
                                Fleetbase API Key
                            </Text>
                            <Text color='$red900' fontWeight='500' ml='$1'>
                                {translate('Exceptions.SetupWarningScreen.envMissingText')}
                            </Text>
                        </XStack>
                    )}
                    {keyMissing('STOREFRONT_KEY') && (
                        <XStack alignItems='center' bg='$red1' borderRadius='$2' px='$3' py='$2'>
                            <FontAwesomeIcon icon={faExclamation} size={12} color='#7F1D1D' style={{ marginRight: 8 }} />
                            <Text color='$red900' fontWeight='bold'>
                                Storefront Key
                            </Text>
                            <Text color='$red900' fontWeight='500' ml='$1'>
                                {translate('Exceptions.SetupWarningScreen.envMissingText')}
                            </Text>
                        </XStack>
                    )}
                    {error && (
                        <XStack alignItems='center' justifyContent='center' bg='$red1' backgroundColor='$red1' borderRadius='$2' px='$3' py='$2' mt='$2'>
                            <Text color='$red9' fontWeight='600' fontSize='14'>
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
