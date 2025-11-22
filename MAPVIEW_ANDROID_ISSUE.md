# MapView Android Marker Rendering Issue

## Problem Summary

After upgrading React Native from 0.77.0 to 0.81.5, **NO markers render on Android MapView** despite:
- ✅ Map tiles rendering correctly
- ✅ Markers being created (console logs confirm)
- ✅ Valid coordinates
- ✅ Everything works perfectly on iOS

## Evidence

Console logs show:
```
[FoodTruckScreen] Rendering simple Marker on Android: {lat: 47.9167609, lng: 106.898928}
```

But no markers appear on the map - not VehicleMarker, not simple Marker, NOTHING.

## Current Configuration

- **react-native-maps**: 1.20.0
- **React Native**: 0.81.5
- **Android SDK**: 36
- **AGP**: 8.6.0
- **Gradle**: 8.13
- **Google Maps API Key**: Configured in AndroidManifest.xml

## Potential Causes

### 1. Missing Google Play Services Maps Dependency

react-native-maps 1.20.0 might require explicit Google Play Services dependency for Android.

**Check**: `android/app/build.gradle` has NO `play-services-maps` dependency

### 2. React Native 0.81.5 + react-native-maps Compatibility

react-native-maps 1.20.0 might not be fully compatible with RN 0.81.5.

### 3. Android 16 (SDK 36) Compatibility

The upgrade to Android SDK 36 might have introduced breaking changes with react-native-maps.

### 4. MapView Provider Issue

Using `PROVIDER_DEFAULT` might not work correctly on Android after upgrade.

### 5. Conditional MapView Rendering

The conditional rendering we added for the map flash fix might be interfering:
```typescript
{(Platform.OS === 'ios' || currentLocation) && <MapView ...>}
```

## Potential Fixes

### Fix 1: Add Google Play Services Maps Dependency

Add to `android/app/build.gradle`:

```gradle
dependencies {
    // ... existing dependencies
    
    // Google Play Services Maps for react-native-maps
    implementation 'com.google.android.gms:play-services-maps:18.2.0'
}
```

### Fix 2: Upgrade react-native-maps

Upgrade to latest version that supports RN 0.81.5:

```bash
npm install react-native-maps@latest
cd android && ./gradlew clean
cd ..
npx react-native run-android
```

### Fix 3: Force Google Maps Provider on Android

In FoodTruckScreen.tsx:

```typescript
<MapView
    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
    // ... rest of props
>
```

### Fix 4: Remove Conditional MapView Rendering

The conditional rendering might be causing issues with marker mounting:

```typescript
// Remove the condition
<MapView ...>
```

And handle the map flash differently.

### Fix 5: Add MapView Key Prop

Force MapView to remount when location is available:

```typescript
<MapView
    key={currentLocation ? 'with-location' : 'no-location'}
    // ... rest of props
>
```

### Fix 6: Check react-native-maps Android Setup

Verify all setup steps from react-native-maps documentation:
- https://github.com/react-native-maps/react-native-maps/blob/master/docs/installation.md

## Testing Priority

1. **Fix 1** (Add play-services-maps) - Most likely fix
2. **Fix 3** (Force PROVIDER_GOOGLE) - Quick test
3. **Fix 4** (Remove conditional rendering) - Might fix both issues
4. **Fix 2** (Upgrade react-native-maps) - If others fail
5. **Fix 5** (Add key prop) - Alternative approach
6. **Fix 6** (Verify setup) - Last resort

## Related Issues

- react-native-maps GitHub issues with "markers not showing android"
- React Native 0.81+ compatibility issues
- Android SDK 36 compatibility

## Next Steps

1. Try Fix 1 first (add play-services-maps dependency)
2. Clean build and test
3. If that doesn't work, try Fix 3 (force PROVIDER_GOOGLE)
4. Document which fix works for future reference
