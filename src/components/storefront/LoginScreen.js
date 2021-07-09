import React, { useState } from 'react';
import { SafeAreaView, View, Text, ImageBackground, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { getUniqueId } from 'react-native-device-info';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { useStorefrontSdk, updateCustomer } from '../../utils';
import { getLocation } from '../../utils/location';
import { set } from '../../utils/storage';
import tailwind from '../../tailwind';
import PhoneInput from '../ui/PhoneInput';

const StorefrontLoginScreen = ({ navigation, route }) => {
    const { info, key } = route.params;
    const [phone, setPhone] = useState(null);
    const [code, setCode] = useState(null);
    const [isAwaitingVerification, setIsAwaitingVerification] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const storefront = useStorefrontSdk();
    const location = getLocation();

    const sendVerificationCode = () => {
        setIsLoading(true);

        storefront.customers.login(phone).then((response) => {
            setIsAwaitingVerification(true);
            setIsLoading(false);
        });
    };

    const verifyCode = () => {
        setIsLoading(true);

        storefront.customers.verifySmsCode(phone, code).then((customer) => {
            updateCustomer(customer);
            setIsLoading(false);
            navigation.goBack();
        });
    };

    return (
        <SafeAreaView style={tailwind('bg-white')}>
            <View style={tailwind('w-full h-full bg-white relative')}>
                <View style={tailwind('flex flex-row items-center p-4')}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                        <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                            <FontAwesomeIcon icon={faTimes} />
                        </View>
                    </TouchableOpacity>
                    <Text style={tailwind('text-xl font-semibold')}>Login</Text>
                </View>
                <View style={tailwind('px-4 py-6')}>
                    {!isAwaitingVerification && (
                        <View>
                            <View style={tailwind('mb-6')}>
                                <PhoneInput value={phone} onChangeText={setPhone} defaultCountry={location?.country} />
                            </View>
                            <TouchableOpacity onPress={sendVerificationCode}>
                                <View style={tailwind('btn border border-blue-500')}>
                                    {isLoading && <ActivityIndicator color={'rgba(59, 130, 246, 1)'} style={tailwind('mr-2')} />}
                                    <Text style={tailwind('font-semibold text-blue-500 text-lg text-center')}>Send Verification Code</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                    {isAwaitingVerification && (
                        <View>
                            <View style={tailwind('mb-6')}>
                                <TextInput onChangeText={setCode} keyboardType={'phone-pad'} placeholder={'Enter verification code'} style={tailwind('form-input text-center')} />
                            </View>
                            <TouchableOpacity onPress={verifyCode}>
                                <View style={tailwind('btn border border-green-500')}>
                                    {isLoading && <ActivityIndicator color={'rgba(16, 185, 129, 1)'} style={tailwind('mr-2')} />}
                                    <Text style={tailwind('font-semibold text-green-500 text-lg text-center')}>Verify Code</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

export default StorefrontLoginScreen;
