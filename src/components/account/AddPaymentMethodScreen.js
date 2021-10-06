import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { Place, GoogleAddress } from '@fleetbase/sdk';
import { adapter } from '../../utils/use-fleetbase-sdk';
import { getCustomer } from '../../utils/customer';
import { get, set, remove } from '../../utils/storage';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import useStorefrontSdk from '../../utils/use-storefront-sdk';
import tailwind from '../../tailwind';

const AddPaymentMethodScreen = ({ navigation, route }) => {
    const storefront = useStorefrontSdk();
    const customer = getCustomer();
    const insets = useSafeAreaInsets();
    const { createPaymentMethod } = useStripe();
    const [isLoading, setIsLoading] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const [card, setCard] = useState(false);

    const validateCardInput = (input) => {
        setCard(input);

        if (input.complete) {
            return setIsValid(true);
        }

        setIsValid(false);
    };

    const savePaymentMethod = () => {
        if (!isValid) {
            return;
        }

        // console.log('savePaymentMethod() card', card.number);

        // createPaymentMethod({ card: { number: }, type: 'card' })
        //     .then((response) => {
        //         console.log(response);
        //     })
        //     .catch((error) => {
        //         console.log(error);
        //     });
    };

    return (
        <View style={[tailwind('w-full h-full bg-white relative'), { paddingTop: insets.top }]}>
            <View style={tailwind('flex flex-row items-center justify-between p-4')}>
                <View style={tailwind('flex flex-row items-center')}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                        <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                            <FontAwesomeIcon icon={faTimes} />
                        </View>
                    </TouchableOpacity>
                    <Text style={tailwind('text-xl font-semibold')}>Add new payment method</Text>
                </View>
            </View>
            <View style={tailwind('p-4')}>
                <CardField
                    postalCodeEnabled={true}
                    placeholder={{
                        number: '4242 4242 4242 4242',
                    }}
                    cardStyle={{
                        backgroundColor: '#f9fafb',
                        textColor: '#000000',
                    }}
                    style={tailwind('w-full h-14 my-7 border border-blue-300')}
                    onCardChange={validateCardInput}
                />
                <TouchableOpacity onPress={savePaymentMethod} disabled={!isValid}>
                    <View style={tailwind(`btn border border-green-50 bg-green-50 ${!isValid ? 'bg-opacity-50' : ''}`)}>
                        {isLoading && <ActivityIndicator color={'rgba(16, 185, 129, 1)'} style={tailwind('mr-2')} />}
                        <Text style={tailwind(`font-semibold text-green-900 ${!isValid ? 'text-opacity-50' : ''} text-lg text-center`)}>Save Payment Method</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default AddPaymentMethodScreen;
