import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Pressable, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faMapMarked, faBox, faPlus, faEdit, faStar, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Customer } from '@fleetbase/storefront';
import { Order, Collection } from '@fleetbase/sdk';
import { useStorefront, useCustomer, useLocale, useMountedState } from 'hooks';
import { adapter } from 'hooks/use-fleetbase';
import { useResourceStorage, useResourceCollection, get, set } from 'utils/Storage';
import { logError, translate, getColorCode, debounce } from 'utils';
import { format } from 'date-fns';
import FastImage from 'react-native-fast-image';
import OrderStatusBadge from 'ui/OrderStatusBadge';
import tailwind from 'tailwind';

const OrderHistoryScreen = ({ navigation, route }) => {
    const { useLeftArrow, info } = route.params;

    const storefront = useStorefront();
    const insets = useSafeAreaInsets();
    const isMounted = useMountedState();
    const isNetwork = info.is_network === true;

    const [orders, setOrders] = useResourceCollection('order', Order, adapter, new Collection());
    const [customer, setCustomer] = useCustomer();
    const [locale, setLocale] = useLocale();
    const [query, setQuery] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isQuerying, setIsQuerying] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    

    const pushOrders = (orders = []) => {
        setOrders(orders);
        return orders;
    };

    const fetchOrders = (options = {}, params = {}) => {
        return new Promise((resolve) => {
            if (customer) {
                if (options?.initialize) {
                    setIsInitializing(options.initialize);
                }

                if (options?.isLoading) {
                    setIsLoading(options.isLoading);
                }

                if (options?.isQuerying) {
                    setIsQuerying(options.isQuerying);
                }

                return customer
                    .getOrderHistory({ query, sort: '-created_at', limit: -1, ...params })
                    .then(pushOrders)
                    .then(resolve)
                    .catch(logError)
                    .finally(() => {
                        setIsLoading(false);
                        setIsQuerying(false);
                        setIsInitializing(false);
                    });
            }

            resolve(new Collection());
        });
    };

    const debouncedSearch = debounce((options = {}, query = {}, callback = null) => {
        fetchOrders(options, query, callback);
    }, 600);

    useEffect(() => {
        fetchOrders({ initialize: true });
    }, [isMounted]);

    useEffect(() => {
        if (!query) {
            Keyboard.dismiss();
        }

        debouncedSearch({ isQuerying: true }, { query }, setOrders);
    }, [query]);

    return (
        <View style={[tailwind('w-full h-full bg-white'), { paddingTop: insets.top }]}>
            <FlatList
                data={orders}
                onRefresh={() => fetchOrders({ isLoading: true })}
                refreshing={isLoading}
                stickyHeaderIndices={[0]}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={tailwind('flex bg-white')}>
                        <View style={tailwind('px-4 py-2 flex flex-row items-center justify-between')}>
                            <View style={tailwind('flex-1 flex flex-row items-center')}>
                                <Text style={tailwind('text-xl font-semibold mr-2')}>{translate('Account.OrderHistoryScreen.title')}</Text>
                                {isQuerying && (
                                    <View style={tailwind('')}>
                                        <ActivityIndicator color={getColorCode('bg-blue-500')} />
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                                <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                                    <FontAwesomeIcon icon={useLeftArrow === true ? faArrowLeft : faTimes} />
                                </View>
                            </TouchableOpacity>
                        </View>
                        <View style={tailwind('px-4 pt-2 pb-4 flex flex-row items-center justify-between border-b border-gray-100 relative')}>
                            <TextInput
                                style={tailwind('flex-1 rounded-md border border-gray-300 px-4 py-2.5 text-gray-900 bg-gray-100 shadow-sm')}
                                value={query}
                                onChangeText={setQuery}
                                placeholder={'Search orders'}
                                placeholderTextColor={getColorCode('text-gray-600')}
                                autoCapitalize={'none'}
                                autoComplete={false}
                                autoCorrect={false}
                                clearButtonMode={'while-editing'}
                            />
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
                                    <Text style={tailwind('font-bold text-xl mb-2 text-center text-gray-800')}>
                                        {isInitializing ? translate('Account.OrderHistoryScreen.bodyTitleLoading') : translate('Account.OrderHistoryScreen.bodyTitle')}
                                    </Text>
                                    {!isInitializing && (
                                        <Text style={tailwind('w-52 text-center text-gray-600 font-semibold')}>{translate('Account.OrderHistoryScreen.emptyStateText')}</Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>
                }
                renderItem={({ item, index }) => (
                    <Pressable onPress={Keyboard.dismiss} key={index}>
                        <TouchableOpacity onPress={() => navigation.navigate('Order', { serializedOrder: item.serialize(), info })}>
                            <View style={tailwind('px-4 py-3 border-b border-gray-100')}>
                                <View style={tailwind('flex flex-row justify-between flex-shrink-0 flex-grow-0')}>
                                    <View style={[tailwind('flex flex-row pr-8 flex-shrink-0'), { maxWidth: 225 }]}>
                                        <View style={tailwind('mr-3')}>
                                            <FastImage source={{ uri: info.logo_url }} style={tailwind('w-10 h-10')} />
                                        </View>
                                        <View style={tailwind('flex')}>
                                            <Text style={tailwind('text-sm font-bold')} numberOfLines={1}>
                                                {item.getAttribute('meta.storefront')}
                                            </Text>
                                            <Text style={tailwind('text-sm text-gray-500')} numberOfLines={1}>
                                                {item.id}
                                            </Text>
                                            <Text style={tailwind('text-sm text-gray-500')} numberOfLines={1}>
                                                {format(item.createdAt, 'PPp')}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={tailwind('flex flex-row justify-end flex-shrink-0 flex-grow-0')}>
                                        <OrderStatusBadge status={item.getAttribute('status')} />
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </Pressable>
                )}
            />
        </View>
    );
};

export default OrderHistoryScreen;
