import React from 'react';
import { SafeAreaView, View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faExclamationTriangle, faExclamation } from '@fortawesome/free-solid-svg-icons';
import { hasRequiredKeys, translate } from 'utils';
import { useLocale } from 'hooks';
import { tailwind } from 'tailwind';
import Config from 'react-native-config';

const keyMissing = (key) => {
    return !Config[key];
};

const SetupWarningScreen = (props) => {

    const [locale] = useLocale();

    return (
        <SafeAreaView style={tailwind('bg-white')}>
            <View style={tailwind('h-full w-full flex items-center justify-center')}>
                <View style={tailwind('flex items-center justify-center w-full')}>
                    <View style={tailwind('flex items-center justify-center mb-6 rounded-full bg-yellow-50 w-60 h-60')}>
                        <FontAwesomeIcon icon={faExclamationTriangle} size={88} style={tailwind('text-yellow-500')} />
                    </View>
                    <View style={tailwind('flex items-center justify-center mb-6')}>
                        <Text style={tailwind('font-bold text-xl mb-2 text-center text-gray-800')}>{translate('Exceptions.SetupWarningScreen.title')}</Text>
                        <Text style={tailwind('w-60 text-center text-gray-600 font-semibold')}>{translate('Exceptions.SetupWarningScreen.subtitle')}</Text>
                    </View>
                    <View style={tailwind('px-5')}>
                        {keyMissing('FLEETBASE_KEY') && (
                            <View style={tailwind('rounded-md px-3 py-2 bg-red-50 flex flex-row items-center mb-2')}>
                                <FontAwesomeIcon icon={faExclamation} size={12} style={tailwind('text-red-900 mr-2')} />
                                <Text style={tailwind('text-red-900')}>
                                    <Text style={tailwind('font-semibold')}>Fleetbase API Key</Text> {translate('Exceptions.SetupWarningScreen.envMissingText')}
                                </Text>
                            </View>
                        )}
                        {keyMissing('STOREFRONT_KEY') && (
                            <View style={tailwind('rounded-md px-3 py-2 bg-red-50 flex flex-row items-center')}>
                                <FontAwesomeIcon icon={faExclamation} size={12} style={tailwind('text-red-900 mr-2')} />
                                <Text style={tailwind('text-red-900')}>
                                    <Text style={tailwind('font-semibold')}>Storefront Key</Text> {translate('Exceptions.SetupWarningScreen.envMissingText')}
                                </Text>
                            </View>
                        )}
                        {props.error && (
                            <View style={tailwind('rounded-md px-3 py-2 bg-red-50 flex flex-row items-center')}>
                                <Text style={tailwind('text-red-900')}>{props.error.message}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default SetupWarningScreen;
