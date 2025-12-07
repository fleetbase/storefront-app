# Android Notification Issue Analysis and Fix

## Problem Summary

The Storefront app shows "All notifications from the app are blocked" in Android app settings after installation from Google Play Store. This occurs despite the app using `react-native-notifications` and registering for remote notifications.

## Root Cause

The application is **missing the required `POST_NOTIFICATIONS` permission** in the AndroidManifest.xml file. This permission is mandatory for Android 13 (API level 33) and above.

### Key Findings

1. **Target SDK Version**: The app targets SDK 36 (Android 14)
   - Located in `android/build.gradle`: `targetSdkVersion = 36`
   - Minimum SDK: 24 (Android 7.0)

2. **Missing Permission**: The `AndroidManifest.xml` lacks the `POST_NOTIFICATIONS` permission
   - Current permissions include: INTERNET, LOCATION, VIBRATE, RECEIVE_BOOT_COMPLETED, CAMERA, WRITE_EXTERNAL_STORAGE
   - **Missing**: `android.permission.POST_NOTIFICATIONS`

3. **No Runtime Permission Request**: The app code does not request notification permissions at runtime
   - `NotificationContext.tsx` calls `Notifications.registerRemoteNotifications()` but doesn't check or request permissions first
   - No usage of `react-native-permissions` for POST_NOTIFICATIONS

4. **Android 13+ Requirement**: Starting with Android 13 (API 33), apps must:
   - Declare `POST_NOTIFICATIONS` permission in the manifest
   - Request this permission at runtime from the user
   - Handle permission denial gracefully

## Solution

### Step 1: Add POST_NOTIFICATIONS Permission to AndroidManifest.xml

**File**: `android/app/src/main/AndroidManifest.xml`

Add the following permission declaration after the existing permissions (around line 10):

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

**Updated AndroidManifest.xml** (lines 1-12):

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
  xmlns:tools="http://schemas.android.com/tools">

  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.VIBRATE" />
  <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" tools:ignore="ScopedStorage" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  <application 
```

### Step 2: Request Permission at Runtime

**File**: `src/contexts/NotificationContext.tsx`

The app needs to request notification permission at runtime before registering for remote notifications. Update the `useEffect` hook to include permission checking:

```typescript
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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

    // Function to add a listener
    const addNotificationListener = (callback) => {
        notificationListeners.current.push(callback);
    };

    // Function to remove a listener
    const removeNotificationListener = (callback) => {
        notificationListeners.current = notificationListeners.current.filter((listener) => listener !== callback);
    };

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
```

### Alternative: Using react-native-permissions

The app already has `react-native-permissions` installed. You can also use this library for a more consistent cross-platform approach:

```typescript
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const requestNotificationPermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
        const result = await check(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
        
        if (result === RESULTS.DENIED) {
            const requestResult = await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
            return requestResult === RESULTS.GRANTED;
        }
        
        return result === RESULTS.GRANTED;
    }
    return true;
};
```

## Implementation Steps

1. **Update AndroidManifest.xml**
   - Add `POST_NOTIFICATIONS` permission

2. **Update NotificationContext.tsx**
   - Add runtime permission request logic
   - Request permission before calling `Notifications.registerRemoteNotifications()`

3. **Rebuild the app**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx react-native run-android --variant=release
   ```

4. **Test the changes**
   - Install the app on Android 13+ device
   - Verify permission dialog appears on first launch
   - Check app settings to confirm notifications are enabled after granting permission

5. **Create new release bundle**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

6. **Upload to Google Play Store**
   - Upload the new AAB file
   - Test with internal/closed testing track first

## Why This Happens

**Android 13 (API 33) introduced a breaking change** where notification permissions became runtime permissions instead of install-time permissions. Apps targeting SDK 33+ must:

1. Declare the permission in the manifest (install-time declaration)
2. Request the permission at runtime (user interaction required)

Without these changes, Android automatically **blocks all notifications** from the app by default, which is exactly what you're experiencing.

## Additional Recommendations

1. **Add permission status checking**: Provide a way for users to re-enable notifications if they initially denied permission
2. **Graceful degradation**: Handle the case where users deny notification permission
3. **Settings deep link**: Add a button to open app settings if permission is denied
4. **User education**: Show an explanation before requesting permission to improve grant rates

## References

- [Android 13 Notification Permission](https://developer.android.com/develop/ui/views/notifications/notification-permission)
- [react-native-notifications Documentation](https://github.com/wix/react-native-notifications)
- [React Native PermissionsAndroid](https://reactnative.dev/docs/permissionsandroid)
