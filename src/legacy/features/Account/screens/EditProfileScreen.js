import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useCustomer, useLocale } from 'hooks';
import React, { useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tailwind from 'tailwind';
import PhoneInput from 'ui/PhoneInput';
import { logError, splitCountryCode, translate } from 'utils';
import { getLocation } from 'utils/Geo';

const EditProfileScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const location = getLocation();

    const [locale, setLocale] = useLocale();
    const [customer, setCustomer] = useCustomer();
    const [name, setName] = useState(customer.getAttribute('name'));
    const [email, setEmail] = useState(customer.getAttribute('email'));
    const [isLoading, setIsLoading] = useState(false);
    const [phone, setPhone] = useState(
        splitCountryCode(customer.getAttribute('phone')) || {
            code: location?.country || '+1',
            number: customer.getAttribute('phone'),
        }
    );

    const [phoneValue, setPhoneValue] = useState();

    const saveProfile = () => {
        setIsLoading(true);

        return customer
            .update({
                name,
                email,
                phoneValue,
            })
            .then((customer) => {
                setCustomer(customer);
                setIsLoading(false);
                navigation.goBack();
            })
            .catch(logError);
    };

    return (
        <View style={[tailwind('w-full h-full bg-white')]}>
            <Pressable onPress={Keyboard.dismiss} style={tailwind('w-full h-full bg-white relative')}>
                <View style={tailwind('flex flex-row items-center p-4')}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                        <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                            <FontAwesomeIcon icon={faTimes} />
                        </View>
                    </TouchableOpacity>
                    <Text style={tailwind('text-xl font-semibold')}>{translate('Account.EditProfileScreen.title')}</Text>
                </View>
                <View style={tailwind('flex w-full h-full')}>
                    <KeyboardAvoidingView style={tailwind('p-4')}>
                        <View style={tailwind('mb-4')}>
                            <Text style={tailwind('font-semibold text-base text-black mb-2')}>{translate('Account.EditProfileScreen.nameLabelText')}</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                keyboardType={'default'}
                                placeholder={translate('Account.EditProfileScreen.nameLabelText')}
                                placeholderTextColor={'rgba(107, 114, 128, 1)'}
                                style={tailwind('form-input')}
                            />
                        </View>
                        <View style={tailwind('mb-4')}>
                            <Text style={tailwind('font-semibold text-base text-black mb-2')}>{translate('Account.EditProfileScreen.emailLabelText')}</Text>
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                keyboardType={'email-address'}
                                placeholder={translate('Account.EditProfileScreen.emailLabelText')}
                                placeholderTextColor={'rgba(107, 114, 128, 1)'}
                                style={tailwind('form-input')}
                            />
                        </View>
                        <View style={tailwind('mb-4')}>
                            <Text style={tailwind('font-semibold text-base text-black mb-2')}>{translate('Account.EditProfileScreen.phoneLabelText')}</Text>
                            <PhoneInput value={phone?.number} defaultCountryCode={phone?.code} />
                        </View>
                        <TouchableOpacity onPress={saveProfile} disabled={isLoading}>
                            <View style={tailwind('btn bg-green-50 border border-green-50')}>
                                {isLoading && <ActivityIndicator color={'rgba(16, 185, 129, 1)'} style={tailwind('mr-2')} />}
                                <Text style={tailwind('font-semibold text-lg text-green-900 text-center')}>{translate('Account.EditProfileScreen.saveButtonText')}</Text>
                            </View>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </View>
            </Pressable>
        </View>
    );
};

export default EditProfileScreen;
