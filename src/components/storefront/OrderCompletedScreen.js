import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faCheck, faStoreAlt, faMapMarkerAlt, faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';
import { getCustomer, updateCustomer } from '../../utils/customer';
import { formatCurrency, calculatePercentage } from '../../utils';
import { Order } from '@fleetbase/sdk';
import { format } from 'date-fns';
import tailwind from '../../tailwind';

const StorefrontOrderCompletedScreen = ({ navigation, route }) => {
    const insets = useSafeAreaInsets();
    const customer = getCustomer();
    const { serializedOrder, info } = route.params;
    const [order, setOrder] = useState(new Order(serializedOrder || {}));
    const isPickupOrder = order.getAttribute('meta.is_pickup');
    const currency = order.getAttribute('meta.currency');
    const subtotal = order.getAttribute('meta.subtotal');
    const total = order.getAttribute('meta.total');
    const tip = order.getAttribute('meta.tip');
    const deliveryTip = order.getAttribute('meta.delivery_tip');
    const isCod = order.getAttribute('payload.cod_amount') > 0;

    const formattedTip = (() => {
        if (typeof tip === 'string' && tip.endsWith('%')) {
            const tipAmount = formatCurrency(calculatePercentage(parseInt(tip), subtotal) / 100, currency);

            return `${tip} (${tipAmount})`;
        }

        return formatCurrency(tip / 100, currency);
    })();
    const formattedDeliveryTip = (() => {
        if (typeof deliveryTip === 'string' && deliveryTip.endsWith('%')) {
            const tipAmount = formatCurrency(calculatePercentage(parseInt(deliveryTip), subtotal) / 100, currency);

            return `${deliveryTip} (${tipAmount})`;
        }

        return formatCurrency(deliveryTip / 100, currency);
    })();

    return (
        <View style={[tailwind('w-full h-full bg-white'), { paddingTop: insets.top }]}>
            <View style={tailwind('w-full h-full bg-white relative')}>
                <View style={tailwind('flex flex-row items-center p-4')}>
                    <TouchableOpacity onPress={() => navigation.navigate('CartScreen')} style={tailwind('mr-4')}>
                        <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                            <FontAwesomeIcon icon={faTimes} />
                        </View>
                    </TouchableOpacity>
                    <Text style={tailwind('text-xl font-semibold')}>Order received!</Text>
                </View>
                <ScrollView>
                    <View style={tailwind('flex w-full h-full pb-60')}>
                        <View style={tailwind('flex flex-row items-center justify-center')}>
                            <View style={tailwind('flex items-center justify-center rounded-full bg-green-50 w-32 h-32 mb-2')}>
                                <FontAwesomeIcon icon={faCheck} size={50} color={'rgba(5, 150, 105, 1)'} />
                            </View>
                        </View>
                        <View style={tailwind('flex flex-col items-center justify-center pb-4')}>
                            <Text style={tailwind('text-xl font-bold mb-2')}>{order.id}</Text>
                            <Text style={tailwind('text-sm text-gray-500')}>{format(order.createdAt, `PP 'at' p`)}</Text>
                        </View>
                        <View style={tailwind('h-full bg-gray-100 pt-2')}>
                            <View style={tailwind('my-2 bg-white p-4')}>
                                <View style={tailwind('flex flex-row items-center')}>
                                    <View style={tailwind('mr-3')}>
                                        <Image source={{ uri: info.logo_url }} style={tailwind('w-10 h-10')} />
                                    </View>
                                    <View>
                                        <Text style={tailwind('font-semibold')}>{info.name}</Text>
                                        <Text style={tailwind('text-gray-500')}>
                                            {order.getAttribute('payload.pickup.name')} - {order.getAttribute('payload.pickup.street1')}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <View style={tailwind('my-2 bg-white')}>
                                <View style={tailwind('flex flex-col items-center')}>
                                    {!isPickupOrder && (
                                        <View style={tailwind('w-full p-4 border-b border-gray-200 relative')}>
                                            <View style={tailwind('w-2 h-full absolute top-4 w-16 flex items-center justify-center')}>
                                                <View style={tailwind('h-full -ml-1 w-1 bg-blue-200')}></View>
                                            </View>
                                            <View style={tailwind('flex flex-row items-center mb-4')}>
                                                <View style={tailwind('flex items-center justify-center rounded-full bg-blue-500 w-7 h-7 mr-4')}>
                                                    <FontAwesomeIcon icon={faStoreAlt} size={16} color={'#fff'} />
                                                </View>
                                                <View>
                                                    <Text style={tailwind('text-sm')}>
                                                        {order.getAttribute('payload.pickup.street1')}, {order.getAttribute('payload.pickup.postal_code')}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={tailwind('flex flex-row items-center')}>
                                                <View style={tailwind('flex items-center justify-center rounded-full bg-red-500 w-7 h-7 mr-4')}>
                                                    <FontAwesomeIcon icon={faMapMarkerAlt} size={16} color={'#fff'} />
                                                </View>
                                                <View>
                                                    <Text style={tailwind('text-sm')}>
                                                        {order.getAttribute('payload.dropoff.name') ?? order.getAttribute('payload.dropoff.street1')},{' '}
                                                        {order.getAttribute('payload.dropoff.postal_code')}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                    {isPickupOrder && (
                                        <View style={tailwind('w-full p-4 border-b border-gray-200 relative')}>
                                            <View style={tailwind('rounded-md bg-blue-50')}>
                                                <View style={tailwind('rounded-t-md bg-blue-100 px-4 py-2 mb-3')}>
                                                    <Text style={tailwind('text-blue-500 font-semibold')}>Pickup order from</Text>
                                                </View>
                                                <View style={tailwind('flex flex-row items-center mb-4 px-4')}>
                                                    <View style={tailwind('flex items-center justify-center rounded-full bg-blue-500 w-7 h-7 mr-3')}>
                                                        <FontAwesomeIcon icon={faStoreAlt} size={16} color={'#fff'} />
                                                    </View>
                                                    <View>
                                                        <View>
                                                            <Text style={tailwind('text-sm text-blue-900')}>{order.getAttribute('payload.pickup.street1')}</Text>
                                                        </View>
                                                        <View style={tailwind('flex flex-row')}>
                                                            {order.getAttribute('payload.pickup.city') && (
                                                                <Text style={tailwind('text-sm text-blue-900')}>{order.getAttribute('payload.pickup.city')}</Text>
                                                            )}
                                                            {order.getAttribute('payload.pickup.neighborhood') && (
                                                                <Text style={tailwind('text-sm text-blue-900')}>, {order.getAttribute('payload.pickup.neighborhood')}</Text>
                                                            )}
                                                            {order.getAttribute('payload.pickup.province') && (
                                                                <Text style={tailwind('text-sm text-blue-900')}>, {order.getAttribute('payload.pickup.province')}</Text>
                                                            )}
                                                            {order.getAttribute('payload.pickup.postal_code') && (
                                                                <Text style={tailwind('text-sm text-blue-900')}>, {order.getAttribute('payload.pickup.postal_code')}</Text>
                                                            )}
                                                        </View>
                                                        <View style={tailwind('flex flex-row')}>
                                                            {order.getAttribute('payload.pickup.country') && (
                                                                <Text style={tailwind('text-sm text-blue-900')}>{order.getAttribute('payload.pickup.country')}</Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                    <View style={tailwind('w-full bg-white p-4 border-b border-gray-200')}>
                                        <Text style={tailwind('font-semibold mb-2')}>Order Notes</Text>
                                        <Text style={tailwind('text-gray-600')}>{order.notes || 'N/A'}</Text>
                                    </View>
                                    <View style={tailwind('w-full bg-white p-4')}>
                                        <Text style={tailwind('font-semibold mb-2')}>QR Code</Text>
                                        <View style={tailwind('flex items-center justify-center py-2')}>
                                            <Image style={tailwind('w-32 h-32')} source={{ uri: `data:image/png;base64,${order.getAttribute('tracking_number.qr_code')}` }} />
                                        </View>
                                    </View>
                                </View>
                            </View>
                            <View style={tailwind('my-2 bg-white')}>
                                <View style={tailwind('flex flex-col items-center')}>
                                    <View style={tailwind('flex flex-row items-center justify-between w-full p-4 border-b border-gray-200')}>
                                        <View style={tailwind('flex flex-row items-center')}>
                                            <Text style={tailwind('font-semibold')}>Order Summary</Text>
                                        </View>
                                        {isCod && (
                                            <View style={tailwind('flex flex-row items-center')}>
                                                <FontAwesomeIcon icon={faMoneyBillWave} style={tailwind('text-green-500 mr-1')} />
                                                <Text style={tailwind('text-green-500 font-semibold')}>Cash</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={tailwind('w-full bg-white p-4')}>
                                        {order.getAttribute('payload.entities', []).map((entity, index) => (
                                            <View key={index} style={tailwind('flex flex-row mb-2')}>
                                                <View style={tailwind('mr-3')}>
                                                    <View style={tailwind('rounded-md border border-gray-300 flex items-center justify-center w-7 h-7 mr-3')}>
                                                        <Text style={tailwind('font-semibold text-blue-500 text-sm')}>{entity.meta.quantity}x</Text>
                                                    </View>
                                                </View>
                                                <View style={tailwind('flex-1')}>
                                                    <Text style={tailwind('font-semibold')}>{entity.name}</Text>
                                                    <Text style={tailwind('text-xs text-gray-500')} numberOfLines={1}>
                                                        {entity.description}
                                                    </Text>
                                                    <View>
                                                        {entity.meta.variants.map((variant) => (
                                                            <View key={variant.id}>
                                                                <Text style={tailwind('text-xs')}>{variant.name}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                    <View>
                                                        {entity.meta.addons.map((addon) => (
                                                            <View key={addon.id}>
                                                                <Text style={tailwind('text-xs')}>+ {addon.name}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                                <View>
                                                    <Text>{formatCurrency(entity.meta.subtotal / 100, entity.currency)}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
                            <View style={tailwind('my-2 bg-white')}>
                                <View style={tailwind('flex flex-col items-center')}>
                                    <View style={tailwind('w-full p-4 border-b border-gray-200')}>
                                        <View style={tailwind('flex flex-row items-center justify-between mb-2')}>
                                            <Text>Subtotal</Text>
                                            <Text>{formatCurrency(order.getAttribute('meta.subtotal') / 100, order.getAttribute('meta.currency'))}</Text>
                                        </View>
                                        {!isPickupOrder && (
                                            <View style={tailwind('flex flex-row items-center justify-between mb-2')}>
                                                <Text>Delivery fee</Text>
                                                <Text>{formatCurrency(order.getAttribute('meta.delivery_fee') / 100, order.getAttribute('meta.currency'))}</Text>
                                            </View>
                                        )}
                                        {tip && (
                                            <View style={tailwind('flex flex-row items-center justify-between mb-2')}>
                                                <Text>Tip</Text>
                                                <Text>{formattedTip}</Text>
                                            </View>
                                        )}
                                        {deliveryTip && !isPickupOrder && (
                                            <View style={tailwind('flex flex-row items-center justify-between mb-2')}>
                                                <Text>Delivery Tip</Text>
                                                <Text>{formattedDeliveryTip}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={tailwind('w-full p-4')}>
                                        <View style={tailwind('flex flex-row items-center justify-between')}>
                                            <Text style={tailwind('font-semibold')}>Total</Text>
                                            <Text style={tailwind('font-semibold')}>{formatCurrency(order.getAttribute('meta.total') / 100, order.getAttribute('meta.currency'))}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
};

export default StorefrontOrderCompletedScreen;
