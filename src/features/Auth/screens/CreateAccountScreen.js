import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, ImageBackground, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { useStorefront } from 'hooks';
import { updateCustomer } from 'utils/Customer';
import { getLocation } from 'utils/Geo';
import { get } from 'utils/Storage';
import tailwind from 'tailwind';
import PhoneInput from 'ui/PhoneInput';

const CreateAccountScreen = ({ navigation, route }) => {
    const { info, redirectTo } = route.params;
    const [name, setName] = useState(null);
    const [phone, setPhone] = useState(null);
    const [code, setCode] = useState(null);
    const [isAwaitingVerification, setIsAwaitingVerification] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);
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
                updateCustomer(customer);
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
        <View style={[tailwind('w-full h-full bg-white'), { paddingTop: insets.top }]}>
            <View style={tailwind('w-full h-full bg-white relative')}>
                <View style={tailwind('flex flex-row items-center p-4')}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                        <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                            <FontAwesomeIcon icon={faTimes} />
                        </View>
                    </TouchableOpacity>
                    <Text style={tailwind('text-xl font-semibold')}>Create Account</Text>
                </View>
                <View style={tailwind('px-4 py-6')}>
                    {isNotAwaitingVerification && (
                        <View>
                            <View style={tailwind('mb-8')}>
                                <Text style={tailwind('text-lg text-gray-600')}>Hello, and welcome to {info.name}.</Text>
                                <Text style={tailwind('text-lg text-gray-500')}>Create your account with only your phone and name below.</Text>
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
                                        style={tailwind('form-input py-2 flex flex-row')}
                                        disabled={isAwaitingVerification}
                                        placeholder={'Your name'}
                                    />
                                </View>
                                <View style={tailwind('mb-6')}>
                                    <PhoneInput value={phone} onChangeText={setPhone} defaultCountry={location?.country} disabled={isAwaitingVerification} />
                                </View>
                                <TouchableOpacity onPress={sendVerificationCode}>
                                    <View style={tailwind('btn border border-blue-50 bg-blue-50')}>
                                        {isLoading && <ActivityIndicator color={'rgba(59, 130, 246, 1)'} style={tailwind('mr-2')} />}
                                        <Text style={tailwind('font-semibold text-blue-900 text-lg text-center')}>Send Verification Code</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    {isAwaitingVerification && (
                        <View>
                            <View style={tailwind('mb-8')}>
                                <Text style={tailwind('text-lg text-green-700')}>Thank you, {name}!</Text>
                                <Text style={tailwind('text-lg text-green-500')}>Now you should have received a code to your phone via SMS, verify the code to create your account!</Text>
                            </View>

                            <View>
                                <View style={tailwind('mb-6')}>
                                    <TextInput
                                        onChangeText={setCode}
                                        keyboardType={'phone-pad'}
                                        placeholder={'Enter verification code'}
                                        placeholderTextColor={'rgba(156, 163, 175, 1)'}
                                        style={tailwind('form-input text-center mb-2')}
                                    />
                                    <View style={tailwind('flex flex-row justify-end')}>
                                        <TouchableOpacity onPress={retry}>
                                            <Text style={tailwind('text-blue-900 font-semibold')}>Retry?</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={verifyCode}>
                                    <View style={tailwind('btn border border-green-50 bg-green-50')}>
                                        {isLoading && <ActivityIndicator color={'rgba(16, 185, 129, 1)'} style={tailwind('mr-2')} />}
                                        <Text style={tailwind('font-semibold text-green-900 text-lg text-center')}>Verify Code</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

export default CreateAccountScreen;
