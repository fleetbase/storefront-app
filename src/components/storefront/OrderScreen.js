import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faCheck, faStoreAlt, faMapMarkerAlt, faCogs, faHandHoldingHeart, faSatelliteDish, faShippingFast, faCar } from '@fortawesome/free-solid-svg-icons';
import { getCustomer, updateCustomer } from '../../utils/customer';
import { adapter as FleetbaseAdapter } from '../../utils/use-fleetbase-sdk';
import { formatCurrency } from '../../utils';
import { Order } from '@fleetbase/sdk';
import { format, formatDistance, add } from 'date-fns';
import MapView, { Marker } from 'react-native-maps';
import tailwind from '../../tailwind';

const { addEventListener, removeEventListener } = EventRegister;

const StorefrontOrderScreen = ({ navigation, route }) => {
    const insets = useSafeAreaInsets();
    const customer = getCustomer();
    const { serializedOrder, info } = route.params;
    const [order, setOrder] = useState(new Order(serializedOrder || {}, FleetbaseAdapter));
    const [matrix, setMatrix] = useState({
        distance: 0,
        time: 600,
    });
    const orderStatusMap = {
        created: { icon: faCheck, color: 'green' },
        preparing: { icon: faCogs, color: 'yellow' },
        ready: { icon: faHandHoldingHeart, color: 'indigo' },
        dispatched: { icon: faSatelliteDish, color: 'indigo' },
        driver_assigned: { icon: faShippingFast, color: 'green' },
        driver_enroute: { icon: faShippingFast, color: 'yellow' },
        completed: { icon: faCheck, color: 'green' },
    };
    const { icon, color } = orderStatusMap[order.getAttribute('status')];
    const isEnroute = order.getAttribute('status') === 'driver_enroute';
    // const pickup = order.getAttribute('payload.pickup'); 
    // const dropoff = order.getAttribute('payload.dropoff');

    // deliver states -> created -> preparing -> dispatched -> driver_enroute -> completed
    // pickup states -> created -> preparing -> ready -> completed

    const track = () => {
        order.reload().then(order => {
            setOrder(order);
            order.getDistanceAndTime().then((dt) => {
                setMatrix(dt);
            });
        });
    };

    useEffect(() => {
        const watchNotifications = addEventListener('onNotification', (notification) => {
            console.log('Reloading order', notification);
            order.reload().then(setOrder);

            // set distance and time
            order.getDistanceAndTime().then((dt) => {
                setMatrix(dt);
            });
        });

        track();

        // const tracker = setInterval(track, 2000);

        return () => {
            removeEventListener(watchNotifications);
            clearInterval(tracker);
        };
    }, []);

    return (
        <View style={[tailwind('w-full h-full bg-white'), { paddingTop: insets.top }]}>
            <View style={tailwind('w-full h-full bg-white relative')}>
                <View style={tailwind('flex flex-row items-center p-4')}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                        <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                            <FontAwesomeIcon icon={faTimes} />
                        </View>
                    </TouchableOpacity>
                    <Text style={tailwind('text-xl font-semibold')}>Order {order.getAttribute('status')}</Text>
                </View>
                <ScrollView>
                    <View style={tailwind('flex w-full h-full pb-60')}>
                        <View style={tailwind('flex flex-row items-center justify-center')}>
                            {isEnroute ? (
                                <View style={tailwind('w-full')}>
                                    <MapView
                                        minZoomLevel={12}
                                        maxZoomLevel={20}
                                        style={tailwind('w-full h-60 rounded-md shadow-sm')}
                                        initialRegion={{
                                            latitude: order.getAttribute('payload.pickup.location.coordinates.1'),
                                            longitude: order.getAttribute('payload.pickup.location.coordinates.0'),
                                            latitudeDelta: 1.0922,
                                            longitudeDelta: 0.0421,
                                        }}>
                                        <Marker
                                            coordinate={{
                                                latitude: order.getAttribute('payload.pickup.location.coordinates.1'),
                                                longitude: order.getAttribute('payload.pickup.location.coordinates.0'),
                                            }}>
                                            <View style={tailwind('bg-blue-500 shadow-sm rounded-full w-8 h-8 flex items-center justify-center')}>
                                                <FontAwesomeIcon icon={faStoreAlt} size={18} color={'#fff'} />
                                            </View>
                                        </Marker>
                                        <Marker
                                            coordinate={{
                                                latitude: order.getAttribute('payload.dropoff.location.coordinates.1'),
                                                longitude: order.getAttribute('payload.dropoff.location.coordinates.0'),
                                            }}>
                                            <View style={tailwind('bg-red-500 shadow-sm rounded-full w-8 h-8 flex items-center justify-center')}>
                                                <FontAwesomeIcon icon={faMapMarkerAlt} size={18} color={'#fff'} />
                                            </View>
                                        </Marker>
                                        {order.hasAttribute('driver_assigned') && (
                                            <Marker
                                                coordinate={{
                                                    latitude: order.getAttribute('driver_assigned.location.coordinates.1'),
                                                    longitude: order.getAttribute('driver_assigned.location.coordinates.0'),
                                                }}>
                                                <View style={tailwind('bg-green-500 shadow-sm rounded-full w-8 h-8 flex items-center justify-center')}>
                                                    <FontAwesomeIcon icon={faCar} size={18} color={'#fff'} />
                                                </View>
                                            </Marker>
                                        )}
                                    </MapView>
                                </View>
                            ) : (
                                <View style={tailwind(`flex items-center justify-center rounded-full bg-${color}-50 w-32 h-32 mb-2`)}>
                                    <FontAwesomeIcon icon={icon} size={50} style={tailwind(`text-${color}-600`)} />
                                </View>
                            )}
                        </View>
                        <View style={tailwind('flex flex-col items-center justify-center py-4')}>
                            {isEnroute && (
                                <View style={tailwind('py-4')}>
                                    <Text style={tailwind('text-lg font-semibold')}>Arriving in {formatDistance(new Date(), add(new Date(), { seconds: matrix.time }))}</Text>
                                </View>
                            )}
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
                                                    {order.getAttribute('payload.dropoff.name') || `${order.getAttribute('street1')}, ${order.getAttribute('postal_code')}`}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={tailwind('w-full bg-white p-4')}>
                                        <Text style={tailwind('font-semibold mb-2')}>Order Notes</Text>
                                        <Text style={tailwind('text-gray-600')}>{order.notes || 'N/A'}</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={tailwind('my-2 bg-white')}>
                                <View style={tailwind('flex flex-col items-center')}>
                                    <View style={tailwind('w-full p-4 border-b border-gray-200')}>
                                        <View style={tailwind('flex flex-row items-center')}>
                                            <Text style={tailwind('font-semibold')}>Order Summary</Text>
                                        </View>
                                    </View>
                                    <View style={tailwind('w-full bg-white p-4')}>
                                        {order.getAttribute('payload.entities', []).map((entity, index) => (
                                            <View key={index} style={tailwind('flex flex-row')}>
                                                <View style={tailwind('mr-3')}>
                                                    <View style={tailwind('rounded-md border border-gray-300 flex items-center justify-center w-7 h-7 mr-3')}>
                                                        <Text style={tailwind('font-semibold text-blue-500 text-sm')}>{entity.meta.quantity}x</Text>
                                                    </View>
                                                </View>
                                                <View style={tailwind('flex-1')}>
                                                    <Text style={tailwind('font-semibold')}>{entity.name}</Text>
                                                    <Text style={tailwind('text-xs text-gray-500')} numberOfLines={1}>{entity.description}</Text>
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
                                        <View style={tailwind('flex flex-row items-center justify-between')}>
                                            <Text>Delivery fee</Text>
                                            <Text>{formatCurrency(order.getAttribute('meta.delivery_fee') / 100, order.getAttribute('meta.currency'))}</Text>
                                        </View>
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

export default StorefrontOrderScreen;
