import { useEffect } from 'react';
import { View, Platform, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { isOrderNotification } from '../utils/notifications';
import { remove as removeStored } from '../utils/storage';
import { markOrderHistoryDirty } from '../utils/order-history-cache';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
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
    const { customer } = useAuth() as any;
    const customerId = customer?.id ?? null;
    const openNotification = useOpenNotification();
    const { refresh: refreshUnread } = useUnreadNotifications();
    // A saved session the server no longer accepts signs out once, instead of failing every request.
    useVerifySession();

    useEffect(() => {
        if (!fleetbase) {
            return;
        }

        const handleOrderNotification = async (notification, action) => {
            // Every push may add to the inbox, and an order push means the order list is out of date.
            refreshUnread();
            if (isOrderNotification(notification)) markOrderHistoryDirty(customerId);
            if (!action) return;

            if (isOrderNotification(notification)) {
                // An order update that points somewhere to act (a payment link for a balance due).
                const target = targetFromPush(notification?.payload);
                if (target && 'url' in target) {
                    openNotification(target);
                    return;
                }
                const orderId = notification.payload.id;
                // The order screen shows its own cached copy at once and always loads the latest;
                // a copy persisted here from an earlier push would only be out of date.
                try {
                    removeStored(`${orderId}_order`);
                } catch {
                    // Nothing persisted.
                }
                navigation.navigate('OrderModal', { orderId });
                return;
            }

            // Offers, chat messages and store announcements open where they point.
            openNotification(targetFromPush(notification?.payload));
        };

        addNotificationListener(handleOrderNotification);

        return () => {
            removeNotificationListener(handleOrderNotification);
        };
    }, [addNotificationListener, removeNotificationListener, customerId, fleetbase, navigation, openNotification, refreshUnread]);

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
