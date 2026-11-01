import React, { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';
import { Notifications } from 'react-native-notifications';
import { Platform, PermissionsAndroid } from 'react-native';
import useStorage from '../hooks/use-storage';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useStorage('_push_notifications', []);
    const [lastNotification, setLastNotification] = useStorage('_last_push_notification');
    const [deviceToken, setDeviceToken] = useStorage('_device_token');
    const [permissionGranted, setPermissionGranted] = useState(false);
    const notificationListeners = useRef([]);

    // Listeners get every push: received in the foreground (no action) or opened (with the
    // action). Stable functions, so screens can subscribe in an effect without resubscribing
    // on every render.
    const addNotificationListener = useCallback((callback) => {
        notificationListeners.current.push(callback);
    }, []);

    const removeNotificationListener = useCallback((callback) => {
        notificationListeners.current = notificationListeners.current.filter((listener) => listener !== callback);
    }, []);

    // Request notification permission for Android 13+
    const requestNotificationPermission = async () => {
        if (Platform.OS === 'android' && Platform.Version >= 33) {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                    {
                        title: 'Notification Permission',
                        message: 'This app needs permission to send you notifications about your orders and updates.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );
                
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    console.log('Notification permission granted');
                    setPermissionGranted(true);
                    return true;
                } else {
                    console.log('Notification permission denied');
                    setPermissionGranted(false);
                    return false;
                }
            } catch (err) {
                console.warn('Error requesting notification permission:', err);
                return false;
            }
        } else {
            // For iOS or Android < 13, permission is handled differently
            setPermissionGranted(true);
            return true;
        }
    };

    useEffect(() => {
        // react-native-notifications is native only: the web build has no push (order updates
        // arrive over the socket while the page is open).
        if (Platform.OS === 'web') return;

        // Request permission first, then register for notifications
        const initializeNotifications = async () => {
            const hasPermission = await requestNotificationPermission();
            
            if (!hasPermission && Platform.OS === 'android' && Platform.Version >= 33) {
                console.log('Notification permission not granted, skipping registration');
                return;
            }

            Notifications.registerRemoteNotifications();

            // Foreground notification handler
            const notificationDisplayedListener = Notifications.events().registerNotificationReceivedForeground((notification, completion) => {
                console.log('Notification received in foreground:', notification);
                setLastNotification(notification);
                setNotifications((prev) => [...prev, notification]);

                // Notify all listeners
                notificationListeners.current.forEach((listener) => listener(notification));

                // iOS shows it through completion(); on Android the library hands a push that
                // arrives while the app is open to JS only, so show it in the tray ourselves.
                // Data-only pushes (no title or body) are skipped by the library.
                if (Platform.OS === 'android') {
                    try {
                        Notifications.postLocalNotification(notification.payload);
                    } catch (error) {
                        console.warn('Unable to show notification:', error);
                    }
                }

                completion({ alert: true, sound: true, badge: false });
            });

            // Notification opened handler
            const notificationOpenedListener = Notifications.events().registerNotificationOpened((notification, completion, action) => {
                console.log('Notification opened:', notification);
                setLastNotification(notification);

                // Notify all listeners (optional, based on use case)
                notificationListeners.current.forEach((listener) => listener(notification, action));

                completion();
            });

            // Remote notifications registered successfully
            const registeredListener = Notifications.events().registerRemoteNotificationsRegistered((event) => {
                setDeviceToken(event.deviceToken);
                console.log('Device registered for remote notifications:', event.deviceToken);
            });

            // Failed to register for remote notifications
            const registrationFailedListener = Notifications.events().registerRemoteNotificationsRegistrationFailed((error) => {
                console.error('Failed to register for remote notifications:', error);
            });

            // Clean up listeners on unmount
            return () => {
                notificationDisplayedListener.remove();
                notificationOpenedListener.remove();
                registeredListener.remove();
                registrationFailedListener.remove();
            };
        };

        initializeNotifications();
    }, []);

    return (
        <NotificationContext.Provider 
            value={{ 
                notifications, 
                lastNotification, 
                deviceToken, 
                permissionGranted,
                addNotificationListener, 
                removeNotificationListener,
                requestNotificationPermission 
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
