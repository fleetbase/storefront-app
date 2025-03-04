import { useEffect } from 'react';
import { View, Platform, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { isOrderNotification } from '../utils/notifications';
import { loadPersistedResource } from '../utils';
import { useNotification } from '../contexts/NotificationContext';
import useFleetbase from '../hooks/use-fleetbase';
import Spacer from '../components/Spacer';

const StoreLayout = ({ children, state, descriptors, navigation: tabNavigation }) => {
    const navigation = useNavigation();
    const { fleetbase } = useFleetbase();
    const { addNotificationListener, removeNotificationListener } = useNotification();

    useEffect(() => {
        if (!fleetbase) {
            return;
        }

        const handleOrderNotification = async (notification, action) => {
            if (isOrderNotification(notification) && action) {
                const orderId = notification.payload.id;
                try {
                    const order = await loadPersistedResource((fleetbase) => fleetbase.orders.findRecord(orderId), { type: 'order', persistKey: `${orderId}_order`, client: fleetbase });
                    navigation.navigate('OrderModal', { order: order.serialize() });
                } catch (err) {
                    console.error(`Failed to load order (${orderId}) from push notification context:`, err);
                }
            }
        };

        addNotificationListener(handleOrderNotification);

        return () => {
            removeNotificationListener(handleOrderNotification);
        };
    }, [addNotificationListener, removeNotificationListener, fleetbase]);

    if (Platform.OS === 'web') {
        return <SafeAreaView style={{ flex: 1, width: '100%', height: '100%' }}>{children}</SafeAreaView>;
    }

    return <View style={{ width: '100%', height: '100%', flex: 1 }}>{children}</View>;
};

export default StoreLayout;
