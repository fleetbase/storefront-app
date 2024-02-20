import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useCustomer, useLocale, useStorefront } from 'hooks';
import React, { useState } from 'react';
import { ActivityIndicator, ImageBackground, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tailwind from 'tailwind';
import PhoneInput from 'ui/PhoneInput';
import { config, logError, translate } from 'utils';
import { getLocation } from 'utils/Geo';
import { get } from 'utils/Storage';

const LoginScreen = ({ navigation, route }) => {
    const { info, redirectTo } = route.params;

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

        storefront.customers
            .login(phone)
            .then((response) => {
                setIsAwaitingVerification(true);
                setIsLoading(false);
            })
            .catch((error) => {
                logError(error);
                setIsLoading(false);
                setError(error.message);
            });
    };

    const verifyCode = () => {
        setIsLoading(true);

        storefront.customers
            .verifyCode(phone, code)
            .then((customer) => {
                setCustomer(customer);
                syncDevice(customer);
                setIsLoading(false);

                if (redirectTo) {
                    navigation.navigate(redirectTo);
                } else {
                    navigation.goBack();
                }
            })
            .catch((error) => {
                logError(error);
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
            source={config('ui.loginScreen.containerBackgroundImage')}
            resizeMode={config('ui.loginScreen.containerBackgroundResizeMode') ?? 'cover'}
            style={[config('ui.loginScreen.containerBackgroundImageStyle')]}>
            <View style={[tailwind('w-full h-full bg-white relative'), config('ui.loginScreen.containerStyle'), { paddingTop: insets.top }]}>
                <View style={[tailwind('flex flex-row items-center p-4'), config('ui.loginScreen.headerContainerStyle')]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                        <View style={[tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center'), config('ui.loginScreen.headerIconContainerStyle')]}>
                            <FontAwesomeIcon icon={faTimes} style={[config('ui.loginScreen.headerIconStyle')]} />
                        </View>
                    </TouchableOpacity>
                    <Text style={[tailwind('text-xl font-semibold'), config('ui.loginScreen.headerTextStyle')]}>{translate('Auth.LoginScreen.title')}</Text>
                </View>
                <Pressable onPress={Keyboard.dismiss} style={[tailwind('px-4 py-6'), config('ui.loginScreen.contentContainerStyle')]}>
                    {isNotAwaitingVerification && (
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80} style={[config('ui.loginScreen.loginFormContainerStyle')]}>
                            {error && (
                                <View style={tailwind('mb-8')}>
                                    <Text style={tailwind('text-lg text-red-600')}>{error}</Text>
                                </View>
                            )}
                            <View style={tailwind('mb-6')}>
                                <PhoneInput
                                    onChangeValue={setPhone}
                                    autoFocus={true}
                                    defaultCountryCode={location?.country || '+1'}
                                    style={config('ui.loginScreen.phoneInputStyle')}
                                    {...(config('ui.createAccountScreen.phoneInputProps') ?? {})}
                                />
                            </View>
                            <TouchableOpacity style={tailwind('mb-3')} onPress={sendVerificationCode}>
                                <View style={[tailwind('btn border border-blue-50 bg-blue-50'), config('ui.loginScreen.sendVerificationCodeButtonStyle')]}>
                                    {isLoading && <ActivityIndicator color={'rgba(59, 130, 246, 1)'} style={tailwind('mr-2')} />}
                                    <Text style={[tailwind('font-semibold text-blue-900 text-lg text-center'), config('ui.loginScreen.sendVerificationCodeButtonTextStyle')]}>
                                        {translate('Auth.LoginScreen.sendVerificationCodeButtonText')}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity disabled={isLoading} onPress={() => navigation.navigate('CreateAccount', { redirectTo })}>
                                <View style={[tailwind('btn border border-green-50 bg-green-50'), config('ui.loginScreen.createAccountButtonStyle')]}>
                                    <Text style={[tailwind('font-semibold text-green-900 text-lg text-center'), config('ui.loginScreen.createAccountButtonTextStyle')]}>
                                        {translate('Auth.LoginScreen.createAccountButtonText')}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </KeyboardAvoidingView>
                    )}
                    {isAwaitingVerification && (
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            keyboardVerticalOffset={140}
                            style={[config('ui.loginScreen.verifyFormContainerStyle')]}>
                            {error && (
                                <View style={tailwind('mb-8')}>
                                    <Text style={tailwind('text-lg text-red-600')}>{error}</Text>
                                </View>
                            )}
                            <View style={tailwind('mb-6')}>
                                <TextInput
                                    onChangeText={setCode}
                                    keyboardType={'phone-pad'}
                                    placeholder={translate('Auth.LoginScreen.codeInputPlaceholder')}
                                    placeholderTextColor={'rgba(156, 163, 175, 1)'}
                                    style={[tailwind('form-input text-center mb-2'), config('ui.loginScreen.verifyCodeInputStyle')]}
                                    {...(config('ui.loginScreen.verifyCodeInputProps') ?? {})}
                                />
                                <View style={tailwind('flex flex-row justify-end')}>
                                    <TouchableOpacity style={config('ui.loginScreen.retryButtonStyle')} onPress={retry}>
                                        <Text style={[tailwind('text-blue-900 font-semibold'), config('ui.loginScreen.retryButtonTextStyle')]}>
                                            {translate('Auth.LoginScreen.retryButtonText')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <TouchableOpacity onPress={verifyCode}>
                                <View style={[tailwind('btn border border-green-50 bg-green-50'), config('ui.loginScreen.verifyCodeButtonStyle')]}>
                                    {isLoading && <ActivityIndicator color={'rgba(16, 185, 129, 1)'} style={tailwind('mr-2')} />}
                                    <Text style={[tailwind('font-semibold text-green-900 text-lg text-center'), config('ui.loginScreen.verifyCodeButtonTextStyle')]}>
                                        {translate('Auth.LoginScreen.verifyCodeButtonText')}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </KeyboardAvoidingView>
                    )}
                </Pressable>
            </View>
        </ImageBackground>
    );
};

export default LoginScreen;
