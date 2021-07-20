import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { getCustomer, updateCustomer } from '../../utils/customer';
import { Order } from '@fleetbase/sdk';
import tailwind from '../../tailwind';

const StorefrontOrderCompletedScreen = ({ navigation, route }) => {
    const insets = useSafeAreaInsets();
    const customer = getCustomer();
    const { orderJson } = route.params;
    const [ order, setOrder ] = useState(new Order(orderJson));

    return (
        <View style={[tailwind('w-full h-full bg-white'), { paddingTop: insets.top }]}>
            <View style={tailwind('w-full h-full bg-white relative')}>
                <View style={tailwind('flex flex-row items-center p-4')}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                        <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                            <FontAwesomeIcon icon={faTimes} />
                        </View>
                    </TouchableOpacity>
                    <Text style={tailwind('text-xl font-semibold')}>Order #{order.id} Successful!</Text>
                </View>
                <View style={tailwind('flex w-full h-full')}>
                </View>
            </View>
        </View>
    );
};

export default StorefrontOrderCompletedScreen;
