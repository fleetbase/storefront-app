import React, { useState } from 'react';
import { SafeAreaView, View, Text, ImageBackground, TouchableOpacity, TextInput } from 'react-native';
import { getUniqueId } from 'react-native-device-info';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import tailwind from '../../tailwind';
import Storefront from '@fleetbase/storefront';
import { set } from '../../utils/storage';

const StorefrontLoginScreen = ({ navigation, route }) => {
    const { info, key } = route.params;
    const storefront = new Storefront(key, { host: 'https://v2api.fleetbase.engineering' });
    const [phone, setPhone] = useState(null);
    const [code, setCode] = useState(null);
    const [isAwaitingVerification, setIsAwaitingVerification] = useState(false);

    const sendVerificationCode = () => {
        storefront.customers.login(phone).then((response) => {
            setIsAwaitingVerification(true);
        });
    };

    const verifyCode = () => {
        storefront.customers.verifySmsCode(phone, code).then((customer) => {
            set('customer', customer.serialize());
            EventRegister.emit('customer.created', customer);
            navigation.goBack();
        });
    }

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
                            <TextInput onChangeText={setPhone} keyboardType={'phone-pad'} placeholder={'Your mobile #'} style={tailwind('border border-gray-700 rounded-md px-4 py-4 text-base leading-6 mb-6')} />
                            <TouchableOpacity onPress={sendVerificationCode}>
                                <View style={tailwind('rounded-md px-8 py-2 bg-white border border-green-500')}>
                                    <Text style={tailwind('font-semibold text-green-500 text-lg text-center')}>Send Verification Code</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                    {isAwaitingVerification && (
                        <View>
                            <TextInput onChangeText={setCode} keyboardType={'phone-pad'} placeholder={'Enter verification code'} style={tailwind('border border-gray-700 rounded-md px-4 py-4 text-base leading-6 mb-6')} />
                            <TouchableOpacity onPress={verifyCode}>
                                <View style={tailwind('rounded-md px-8 py-2 bg-white border border-green-500')}>
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
