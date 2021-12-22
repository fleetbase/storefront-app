import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faMapMarked, faBox, faPlus, faEdit, faStar, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Customer } from '@fleetbase/storefront';
import { Order, Collection } from '@fleetbase/sdk';
import { useStorefront, useCustomer, useLocale } from 'hooks';
import { adapter } from 'hooks/use-fleetbase';
import { useResourceStorage, useResourceCollection, get, set } from 'utils/Storage';
import { logError, translate } from 'utils';
import { format } from 'date-fns';
import tailwind from 'tailwind';

const OrderHistoryScreen = ({ navigation, route }) => {
    const { useLeftArrow, info } = route.params;

    const storefront = useStorefront();
    const insets = useSafeAreaInsets();

    const [orders, setOrders] = useResourceCollection('order', Order, adapter, new Collection());
    const [customer, setCustomer] = useCustomer();
    const [locale, setLocale] = useLocale();
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);

    const loadOrders = (initialize = false) => {
        return new Promise((resolve) => {
            if (customer) {
                setIsInitializing(initialize === true);
                setIsLoading(initialize ? false : true);

                return customer
                    .getOrderHistory()
                    .then((orders) => {
                        setOrders(orders);
                        setIsLoading(false);
                        setIsInitializing(false);
                        resolve(orders);
                    })
                    .catch(logError);
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
                        <TouchableOpacity onPress={() => navigation.navigate('Order', { serializedOrder: item.serialize(), info })}>
                            <View style={tailwind('p-4 border-b border-gray-100')}>
                                <View style={tailwind('flex flex-row justify-between')}>
                                    <View style={tailwind('flex flex-row')}>
                                        <View style={tailwind('mr-3')}>
                                            <Image source={{ uri: info.logo_url }} style={tailwind('w-10 h-10')} />
                                        </View>
                                        <View style={tailwind('flex')}>
                                            <Text style={tailwind('text-sm font-bold')}>{item.getAttribute('meta.storefront')}</Text>
                                            <Text style={tailwind('text-sm text-gray-500')}>{item.id}</Text>
                                            <Text style={tailwind('text-sm text-gray-500')}>{format(item.createdAt, 'PPp')}</Text>
                                        </View>
                                    </View>
                                    <Text>{item.getAttribute('status')}</Text>
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
                            <Text style={tailwind('text-xl font-semibold')}>{translate('Account.OrderHistoryScreen.title')}</Text>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={tailwind('h-full bg-white flex items-center justify-center')}>
                        <View style={tailwind('flex items-center justify-center w-full px-8')}>
                            <View style={tailwind('flex items-center justify-center my-6 rounded-full bg-gray-200 w-60 h-60')}>
                                {isInitializing ? <ActivityIndicator /> : <FontAwesomeIcon icon={faBox} size={88} style={tailwind('text-gray-600')} />}
                            </View>

                            <View style={tailwind('w-full')}>
                                <View style={tailwind('flex items-center justify-center mb-10')}>
                                    <Text style={tailwind('font-bold text-xl mb-2 text-center text-gray-800')}>{isInitializing ? translate('Account.OrderHistoryScreen.bodyTitleLoading') : translate('Account.OrderHistoryScreen.bodyTitle')}</Text>
                                    {!isInitializing && <Text style={tailwind('w-52 text-center text-gray-600 font-semibold')}>{translate('Account.OrderHistoryScreen.emptyStateText')}</Text>}
                                </View>
                            </View>
                        </View>
                    </View>
                }
            />
        </View>
    );
};

export default OrderHistoryScreen;
