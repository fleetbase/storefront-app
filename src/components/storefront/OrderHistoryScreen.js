import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faMapMarked, faPlus, faEdit, faStar, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Customer } from '@fleetbase/storefront';
import { Order, Collection, isResource } from '@fleetbase/sdk';
import { useStorefrontSdk } from '../../utils';
import { getCustomer } from '../../utils/customer';
import { adapter } from '../../utils/use-fleetbase-sdk';
import { useResourceStorage, get, set } from '../../utils/storage';
import tailwind from '../../tailwind';

const StorefrontOrderHistoryScreen = ({ navigation, route }) => {
    const { attributes, useLeftArrow } = route.params;
    const [orders, setOrders] = useResourceStorage('order', Order, adapter, new Collection());
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const customer = getCustomer();
    const storefront = useStorefrontSdk();
    const insets = useSafeAreaInsets();

    const loadOrders = (initialize = false) => {
        return new Promise((resolve) => {
            if (customer) {
                setIsInitializing(initialize === true);
                setIsLoading(initialize ? false : true);

                return customer.getOrderHistory().then((orders) => {
                    setOrders(orders);
                    setIsLoading(false);
                    setIsInitializing(false);

                    resolve(orders);
                });
            }

            resolve(new Collection());
        });
    };

    useEffect(() => {
        loadOrders(true);
    }, []);
    
    return (
        <View style={[tailwind('w-full h-full bg-white'), { paddingTop: insets.top }]}>
            <FlatList
                data={orders}
                onRefresh={loadOrders}
                refreshing={isLoading}
                renderItem={({ item, index }) => (
                    <View key={index}>
                        <TouchableOpacity>
                            <View style={tailwind('p-4 border-b border-gray-100')}>
                                <View style={tailwind('flex flex-row justify-between')}>
                                    <Text>{item.id}</Text>
                                    <Text>{item.status}</Text>
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
                            <Text style={tailwind('text-xl font-semibold')}>Your orders</Text>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={tailwind('h-full bg-white flex items-center justify-center')}>
                        <View style={tailwind('flex items-center justify-center w-full px-8')}>
                            <View style={tailwind('flex items-center justify-center my-6 rounded-full bg-gray-200 w-60 h-60')}>
                                {isInitializing ? <ActivityIndicator /> : <FontAwesomeIcon icon={faMapMarked} size={88} style={tailwind('text-gray-600')} />}
                            </View>

                            <View style={tailwind('w-full')}>
                                <View style={tailwind('flex items-center justify-center mb-10')}>
                                    <Text style={tailwind('font-bold text-xl mb-2 text-center text-gray-800')}>
                                        {isInitializing ? 'Loading your order history' : 'You have no orders'}
                                    </Text>
                                    {!isInitializing && <Text style={tailwind('w-52 text-center text-gray-600 font-semibold')}>Looks like you haven't made any orders.</Text>}
                                </View>
                            </View>
                        </View>
                    </View>
                }
            />
        </View>
    );
};

export default StorefrontOrderHistoryScreen;
