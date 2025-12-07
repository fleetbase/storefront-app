# Quick Fix Summary: Android Notification Issue

## The Problem
After installing from Google Play Store, Android shows "All notifications from the app are blocked" in app settings.

## Root Cause
**Missing `POST_NOTIFICATIONS` permission** - Required for Android 13+ (API 33+)

Your app targets SDK 36 but doesn't declare or request this permission.

## The Fix (2 Simple Changes)

### Change 1: AndroidManifest.xml
**File**: `android/app/src/main/AndroidManifest.xml`

**Add this line** after line 10 (after WRITE_EXTERNAL_STORAGE permission):
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### Change 2: NotificationContext.tsx
**File**: `src/contexts/NotificationContext.tsx`

**Add these imports** at the top:
```typescript
import { Platform, PermissionsAndroid } from 'react-native';
```

**Add this function** inside the `NotificationProvider` component (after the `removeNotificationListener` function):
```typescript
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
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.warn('Error requesting notification permission:', err);
            return false;
        }
    }
    return true;
};
```

**Wrap the existing useEffect content** to request permission first:
```typescript
useEffect(() => {
    const initializeNotifications = async () => {
        const hasPermission = await requestNotificationPermission();
        
        if (!hasPermission && Platform.OS === 'android' && Platform.Version >= 33) {
            console.log('Notification permission not granted');
            return;
        }

        // ... rest of your existing code (Notifications.registerRemoteNotifications(), etc.)
    };

    initializeNotifications();
}, []);
```

## Quick Apply

I've created complete fixed versions of both files:
- `android/app/src/main/AndroidManifest.xml.fixed`
- `src/contexts/NotificationContext.tsx.fixed`

**To apply automatically:**
```bash
./apply-notification-fix.sh
```

This will backup your original files and apply the fixes.

## Test & Deploy

1. **Test locally:**
   ```bash
   npx react-native run-android --variant=release
   ```

2. **Build release bundle:**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

3. **Upload to Google Play Store**
   - The AAB file will be in: `android/app/build/outputs/bundle/release/app-release.aab`

## What Will Change for Users

- On first app launch (Android 13+), users will see a permission dialog
- They can choose to allow or deny notifications
- If allowed, notifications will work normally
- If denied, they can enable it later in app settings

## Why This Happened

Android 13 changed notification permissions from install-time to runtime permissions. Apps targeting SDK 33+ **must** request this permission explicitly, or Android blocks all notifications by default.
