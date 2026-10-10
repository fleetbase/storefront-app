import { useEffect } from 'react';
import { View, Platform, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { isOrderNotification } from '../utils/notifications';
import { loadPersistedResource } from '../utils';
import { useNotification } from '../contexts/NotificationContext';
import useFleetbase from '../hooks/use-fleetbase';
import Spacer from '../components/Spacer';
import { targetFromPush } from '../commerce/notifications';
import useOpenNotification from '../hooks/use-open-notification';
import useUnreadNotifications from '../hooks/use-unread-notifications';
import useVerifySession from '../hooks/use-verify-session';
import { OfflineNotice } from '../ui';

const StoreLayout = ({ children, state, descriptors, navigation: tabNavigation }) => {
    const navigation = useNavigation<any>();
    const { fleetbase } = useFleetbase();
    const { addNotificationListener, removeNotificationListener } = useNotification();
    const openNotification = useOpenNotification();
    const { refresh: refreshUnread } = useUnreadNotifications();
    // A saved session the server no longer accepts signs out once, instead of failing every request.
    useVerifySession();

    useEffect(() => {
        if (!fleetbase) {
            return;
        }

        const handleOrderNotification = async (notification, action) => {
            // Every push may add to the inbox.
            refreshUnread();
            if (!action) return;

            if (isOrderNotification(notification)) {
                const orderId = notification.payload.id;
                try {
                    const order = await loadPersistedResource((fleetbase) => fleetbase.orders.findRecord(orderId), { type: 'order', persistKey: `${orderId}_order`, client: fleetbase });
                    navigation.navigate('OrderModal', { order: order.serialize() });
                } catch (err) {
                    console.error(`Failed to load order (${orderId}) from push notification context:`, err);
                    navigation.navigate('OrderModal', { orderId });
                }
                return;
            }

            // Offers, chat messages and store announcements open where they point.
            openNotification(targetFromPush(notification?.payload));
        };

        addNotificationListener(handleOrderNotification);

        return () => {
            removeNotificationListener(handleOrderNotification);
        };
    }, [addNotificationListener, removeNotificationListener, fleetbase, navigation, openNotification, refreshUnread]);

    if (Platform.OS === 'web') {
        return (
            <SafeAreaView style={{ flex: 1, width: '100%', height: '100%' }}>
                {children}
                <OfflineNotice />
            </SafeAreaView>
        );
    }

    // Every tab screen shows the offline notice from here; screens presented as native
    // modals sit above this layout and show their own.
    return (
        <View style={{ width: '100%', height: '100%', flex: 1 }}>
            {children}
            <OfflineNotice />
        </View>
    );
};

export default StoreLayout;
