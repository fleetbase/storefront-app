import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { getCustomer, updateCustomer } from 'utils/Customer';
import { getLocation } from 'utils/Geo';
import { set } from 'utils/Storage';
import tailwind from 'tailwind';
import PhoneInput from 'ui/PhoneInput';

const EditProfileScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const customer = getCustomer();
    const location = getLocation();
    const [name, setName] = useState(customer.getAttribute('name'));
    const [email, setEmail] = useState(customer.getAttribute('email'));
    const [phone, setPhone] = useState(customer.getAttribute('phone'));
    const [isLoading, setIsLoading] = useState(false);

    const saveProfile = () => {
        setIsLoading(true);

        return customer.setAttributes({
            name, email, phone
        }).saveDirty().then(customer => {
            updateCustomer(customer);
            setIsLoading(false);
            navigation.goBack();
        });
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
                    <Text style={tailwind('text-xl font-semibold')}>Your profile</Text>
                </View>
                <View style={tailwind('flex w-full h-full')}>
                    <View style={tailwind('p-4')}>
                        <View style={tailwind('mb-4')}>
                            <Text style={tailwind('font-semibold text-base text-black mb-2')}>Your name</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                keyboardType={'default'}
                                placeholder={'Your display name'}
                                placeholderTextColor={'rgba(107, 114, 128, 1)'}
                                style={tailwind('form-input')}
                            />
                        </View>
                        <View style={tailwind('mb-4')}>
                            <Text style={tailwind('font-semibold text-base text-black mb-2')}>Your email address</Text>
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                keyboardType={'email-address'}
                                placeholder={'Your email address'}
                                placeholderTextColor={'rgba(107, 114, 128, 1)'}
                                style={tailwind('form-input')}
                            />
                        </View>
                        <View style={tailwind('mb-4')}>
                            <Text style={tailwind('font-semibold text-base text-black mb-2')}>Your mobile number</Text>
                            <PhoneInput
                                value={phone}
                                onChangeText={setPhone}
                                defaultCountry={location?.country}
                            />
                        </View>
                        <TouchableOpacity onPress={saveProfile} disabled={isLoading}>
                            <View style={tailwind('btn bg-green-50 border border-green-50')}>
                                {isLoading && <ActivityIndicator color={'rgba(16, 185, 129, 1)'} style={tailwind('mr-2')} />}
                                <Text style={tailwind('font-semibold text-lg text-green-900 text-center')}>Save Profile</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default EditProfileScreen;
