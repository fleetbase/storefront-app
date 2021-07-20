import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faCreditCard, faPlus, faEdit, faStar, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Customer } from '@fleetbase/storefront';
import { Place, Collection, isResource } from '@fleetbase/sdk';
import { useStorefrontSdk } from '../../utils';
import { getCustomer } from '../../utils/customer';
import { adapter } from '../../utils/use-fleetbase-sdk';
import { useResourceStorage, get, set } from '../../utils/storage';
import tailwind from '../../tailwind';

const StorefrontPaymentMethodsScreen = ({ navigation, route }) => {
    const { attributes, useLeftArrow } = route.params;
    const [paymentMethods, setPaymentMethods] = useState([])
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const customer = getCustomer();
    const storefront = useStorefrontSdk();
    const insets = useSafeAreaInsets();

    const loadPaymentMethods = () => {

    };


    // get addresses
    useEffect(() => {
        
    }, []);

    return (
        <View style={[tailwind('w-full h-full bg-white'), { paddingTop: insets.top }]}>
            <FlatList
                data={paymentMethods}
                onRefresh={loadPaymentMethods}
                refreshing={isLoading}
                renderItem={({ item, index }) => (
                    <View key={index}>
                        <TouchableOpacity>
                            <View style={tailwind('p-4 border-b border-gray-100')}>
                                <View style={tailwind('flex flex-row justify-between')}>
                                    <View style={tailwind('flex-1')}>
                                        <Text>Payment Method</Text>
                                    </View>
                                    <TouchableOpacity>
                                        <View style={tailwind('rounded-full bg-gray-50 w-10 h-10 flex items-center justify-center')}>
                                            <FontAwesomeIcon icon={faEdit} style={tailwind('text-gray-900')} />
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={
                    <View style={tailwind('flex flex-row items-center justify-between p-4')}>
                        <View style={tailwind('flex flex-row items-center')}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                                <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                                    <FontAwesomeIcon icon={useLeftArrow === true ? faArrowLeft : faTimes} />
                                </View>
                            </TouchableOpacity>
                            <Text style={tailwind('text-xl font-semibold')}>Your payment methods</Text>
                        </View>
                        <View>
                            <TouchableOpacity onPress={() => navigation.navigate('AddPaymentMethod')}>
                                <View style={tailwind('rounded-full bg-blue-50 w-10 h-10 flex items-center justify-center')}>
                                    <FontAwesomeIcon icon={faPlus} style={tailwind('text-blue-900')} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={tailwind('h-full bg-white flex items-center justify-center')}>
                        <View style={tailwind('flex items-center justify-center w-full px-8')}>
                            <View style={tailwind('flex items-center justify-center my-6 rounded-full bg-gray-200 w-60 h-60')}>
                                {isInitializing ? <ActivityIndicator /> : <FontAwesomeIcon icon={faCreditCard} size={88} style={tailwind('text-gray-600')} />}
                            </View>

                            <View style={tailwind('w-full')}>
                                <View style={tailwind('flex items-center justify-center mb-10')}>
                                    <Text style={tailwind('font-bold text-xl mb-2 text-center text-gray-800')}>
                                        {isInitializing ? 'Loading your payment methods' : 'You have no payment methods'}
                                    </Text>
                                    {!isInitializing && <Text style={tailwind('w-52 text-center text-gray-600 font-semibold mb-1')}>You don't have any payment methods saved.</Text>}
                                    {!isInitializing && <Text style={tailwind('w-52 text-center text-gray-600 font-semibold')}>Add a new payment method to use for checkout later.</Text>}
                                </View>
                                {!isInitializing && (
                                    <TouchableOpacity style={tailwind('w-full')} onPress={() => navigation.navigate('AddPaymentMethod')}>
                                        <View style={tailwind('flex items-center justify-center rounded-md px-8 py-2 bg-white border border-blue-500 shadow-sm')}>
                                            <Text style={tailwind('font-semibold text-blue-500 text-lg')}>Add new payment method</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                }
            />
        </View>
    );
};

export default StorefrontPaymentMethodsScreen;
