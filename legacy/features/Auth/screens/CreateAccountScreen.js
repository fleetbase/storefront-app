import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useCustomer, useLocale, useStorefront } from 'hooks';
import React, { useState } from 'react';
import { ActivityIndicator, ImageBackground, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tailwind from 'tailwind';
import PhoneInput from 'ui/PhoneInput';
import { config, translate } from 'utils';
import { getLocation } from 'utils/Geo';
import { get } from 'utils/Storage';

const CreateAccountScreen = ({ navigation, route }) => {
    const { info, redirectTo } = route.params;

    const [name, setName] = useState(null);
    const [phone, setPhone] = useState(null);
    const [code, setCode] = useState(null);
    const [isAwaitingVerification, setIsAwaitingVerification] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);
    const [locale, setLocale] = useLocale();
    const [customer, setCustomer] = useCustomer();

    const storefront = useStorefront();
    const location = getLocation();
    const insets = useSafeAreaInsets();
    const isNotAwaitingVerification = isAwaitingVerification === false;

    const syncDevice = (customer) => {
        const token = get('token');

        if (customer && token) {
            customer.syncDevice(token);
        }
    };

    const sendVerificationCode = () => {
        setIsLoading(true);

        storefront.customers.requestCreationCode(phone, 'sms').then((response) => {
            setIsAwaitingVerification(true);
            setIsLoading(false);
        });
    };

    const verifyCode = () => {
        setIsLoading(true);

        storefront.customers
            .create(phone, code, { name, phone })
            .then((customer) => {
                setCustomer(customer);
                syncDevice(customer);
                setIsLoading(false);

                if (redirectTo) {
                    return navigation.navigate(redirectTo);
                }

                navigation.goBack();
            })
            .catch((error) => {
                setError(error.message);
                retry();
            });
    };

    const retry = () => {
        setIsLoading(false);
        setPhone(null);
        setIsAwaitingVerification(false);
    };

    return (
        <ImageBackground
            source={config('ui.createAccountScreen.containerBackgroundImage')}
            resizeMode={config('ui.createAccountScreen.containerBackgroundResizeMode') ?? 'cover'}
            style={[config('ui.createAccountScreen.containerBackgroundImageStyle')]}
        >
            <View style={[tailwind('w-full h-full bg-white relative'), config('ui.createAccountScreen.containerStyle')]}>
                <View style={[tailwind('flex flex-row items-center p-4'), config('ui.createAccountScreen.headerContainerStyle')]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                        <View style={[tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center'), config('ui.createAccountScreen.headerIconContainerStyle')]}>
                            <FontAwesomeIcon icon={faTimes} style={config('ui.createAccountScreen.headerIconStyle')} />
                        </View>
                    </TouchableOpacity>
                    <Text style={[tailwind('text-xl font-semibold'), config('ui.createAccountScreen.headerTextStyle')]}>{translate('Auth.CreateAccountScreen.title')}</Text>
                </View>
                <Pressable onPress={Keyboard.dismiss} style={[tailwind('px-4 py-6'), config('ui.createAccountScreen.contentContainerStyle')]}>
                    {isNotAwaitingVerification && (
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            keyboardVerticalOffset={160}
                            style={[config('ui.createAccountScreen.createAccountFormContainerStyle')]}
                        >
                            <View style={[tailwind('mb-8'), config('ui.createAccountScreen.greetingContainerStyle')]}>
                                <Text style={[tailwind('text-lg text-gray-600'), config('ui.createAccountScreen.greetingLine1TextStyle')]}>
                                    {translate('Auth.CreateAccountScreen.greetingTitle', { infoName: info.name })}
                                </Text>
                                <Text style={[tailwind('text-lg text-gray-500'), config('ui.createAccountScreen.greetingLine2TextStyle')]}>
                                    {translate('Auth.CreateAccountScreen.greetingSubtitle')}
                                </Text>
                            </View>
                            {error && (
                                <View style={tailwind('mb-8')}>
                                    <Text style={tailwind('text-lg text-red-600')}>{error}</Text>
                                </View>
                            )}

                            <View>
                                <View style={tailwind('mb-6')}>
                                    <TextInput
                                        value={name}
                                        onChangeText={setName}
                                        style={[tailwind('form-input py-2 flex flex-row'), config('ui.createAccountScreen.nameInputStyle')]}
                                        disabled={isAwaitingVerification}
                                        placeholder={translate('Auth.CreateAccountScreen.nameInputPlaceholder')}
                                        {...(config('ui.createAccountScreen.nameInputProps') ?? {})}
                                    />
                                </View>
                                <View style={tailwind('mb-6')}>
                                    <PhoneInput
                                        onChangeValue={setPhone}
                                        defaultCountry={location?.country}
                                        disabled={isAwaitingVerification}
                                        style={config('ui.createAccountScreen.phoneInputStyle')}
                                        {...(config('ui.createAccountScreen.phoneInputProps') ?? {})}
                                    />
                                </View>
                                <TouchableOpacity onPress={sendVerificationCode}>
                                    <View style={[tailwind('btn border border-blue-50 bg-blue-50'), config('ui.createAccountScreen.sendVerificationCodeButtonStyle')]}>
                                        {isLoading && <ActivityIndicator color={'rgba(59, 130, 246, 1)'} style={tailwind('mr-2')} />}
                                        <Text style={[tailwind('font-semibold text-blue-900 text-lg text-center'), config('ui.createAccountScreen.sendVerificationCodeButtonTextStyle')]}>
                                            {translate('Auth.CreateAccountScreen.sendVerificationCodeButtonText')}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    )}
                    {isAwaitingVerification && (
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            keyboardVerticalOffset={80}
                            style={[config('ui.createAccountScreen.verifyFormContainerStyle')]}
                        >
                            <View style={[tailwind('mb-8'), config('ui.createAccountScreen.greetingContainerStyle')]}>
                                <Text style={[tailwind('text-lg text-green-700'), config('ui.createAccountScreen.greetingLine1TextStyle')]}>
                                    {translate('Auth.CreateAccountScreen.awaitingVerificationTitle', { name })}
                                </Text>
                                <Text style={[tailwind('text-lg text-green-500'), config('ui.createAccountScreen.greetingLine2TextStyle')]}>
                                    {translate('Auth.CreateAccountScreen.awaitingVerificationSubtitle')}
                                </Text>
                            </View>

                            <View>
                                <View style={tailwind('mb-6')}>
                                    <TextInput
                                        onChangeText={setCode}
                                        keyboardType={'phone-pad'}
                                        placeholder={translate('Auth.CreateAccountScreen.codeInputPlaceholder')}
                                        placeholderTextColor={'rgba(156, 163, 175, 1)'}
                                        style={[tailwind('form-input text-center mb-2'), config('ui.createAccountScreen.verifyCodeInputStyle')]}
                                        {...(config('ui.createAccountScreen.verifyCodeInputProps') ?? {})}
                                    />
                                    <View style={tailwind('flex flex-row justify-end')}>
                                        <TouchableOpacity style={config('ui.createAccountScreen.retryButtonStyle')} onPress={retry}>
                                            <Text style={[tailwind('text-blue-900 font-semibold'), config('ui.createAccountScreen.retryButtonTextStyle')]}>
                                                {translate('Auth.CreateAccountScreen.retryButtonText')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={verifyCode}>
                                    <View style={[tailwind('btn border border-green-50 bg-green-50'), config('ui.createAccountScreen.verifyCodeButtonStyle')]}>
                                        {isLoading && <ActivityIndicator color={'rgba(16, 185, 129, 1)'} style={tailwind('mr-2')} />}
                                        <Text style={[tailwind('font-semibold text-green-900 text-lg text-center'), config('ui.createAccountScreen.verifyCodeButtonTextStyle')]}>
                                            {translate('Auth.CreateAccountScreen.verifyCodeButtonText')}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    )}
                </Pressable>
            </View>
        </ImageBackground>
    );
};

export default CreateAccountScreen;
