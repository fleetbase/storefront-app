# Android Map and Marker Fixes - Testing Guide

## Overview
This guide covers testing the fixes for two critical Android-specific issues in the Fleetbase Storefront app:
1. **Map West Africa Flash**: Map briefly showing (0,0) coordinates before correct location
2. **VehicleMarker Not Rendering**: Food truck markers not appearing on Android map

## Changes Made

### 1. Fix Map West Africa Flash (FoodTruckScreen.tsx)
**Problem**: MapView was rendering immediately with default region (0,0), then animating to correct location, causing a visible flash of West Africa.

**Solution**: Conditional rendering - MapView only renders after `currentLocation` is available on Android.

```typescript
// Before: MapView always rendered
<MapView ... >

// After: Conditional rendering on Android
{(Platform.OS === 'ios' || currentLocation) && <MapView ... >}
```

**Why this works**:
- iOS doesn't have this issue (location loads faster or is cached)
- Android needs to wait for location to be fetched before rendering map
- Prevents initial render with default (0,0) coordinates

### 2. Fix VehicleMarker Not Rendering (TrackingMarker.tsx)
**Problem**: `tracksViewChanges` prop set to `true` causes markers to not render on Android.

**Solution**: Platform-specific logic - immediately set `tracksViewChanges={false}` on Android.

```typescript
// Before: Same logic for both platforms
useEffect(() => {
    if (svgLoading || !!children) {
        setTrackViews(true);
    } else {
        const t = setTimeout(() => setTrackViews(false), 120);
        return () => clearTimeout(t);
    }
}, [svgLoading, children]);

// After: Android-specific handling
useEffect(() => {
    if (Platform.OS === 'android') {
        setTrackViews(false); // Immediate on Android
    } else if (svgLoading || !!children) {
        setTrackViews(true);
    } else {
        const t = setTimeout(() => setTrackViews(false), 120);
        return () => clearTimeout(t);
    }
}, [svgLoading, children]);
```

**Why this works**:
- `tracksViewChanges={true}` is a known issue with react-native-maps on Android
- When true, Android may not render markers properly
- iOS needs the delayed logic for smooth rendering
- Android works best with it disabled immediately

## Testing Instructions

### Prerequisites
- Android device or emulator running Android 14+ (preferably Android 16 for 16 KB testing)
- iOS device or simulator for comparison
- Latest code from `feature/android-16kb-compliance` branch
- Location permissions granted for the app

### Test 1: Map West Africa Flash

**Steps**:
1. **Clean build** (important to ensure changes are applied):
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx react-native run-android
   ```

2. **Navigate to FoodTruckScreen**:
   - Open the app
   - Go to the screen that displays the map with food trucks

3. **Observe map loading**:
   - Watch the map as it loads
   - **Expected behavior**: Map should appear directly at the correct location (no flash)
   - **Previous behavior**: Brief flash of West Africa (0,0) before animating to location

4. **Test multiple times**:
   - Force close the app
   - Reopen and navigate to FoodTruckScreen
   - Repeat 3-5 times to ensure consistency

5. **Compare with iOS**:
   - Run the same test on iOS
   - Both platforms should now have seamless map loading

**Success Criteria**:
- ✅ No visible flash of West Africa (0,0 coordinates)
- ✅ Map appears directly at correct location
- ✅ Smooth loading experience matching iOS
- ✅ No loading delays or blank screens

### Test 2: VehicleMarker Rendering

**Steps**:
1. **Ensure food trucks are available**:
   - Make sure there are active food trucks in the system
   - Verify they have valid location coordinates

2. **Navigate to FoodTruckScreen**:
   - Open the app
   - Go to the map screen

3. **Check for markers**:
   - **Expected behavior**: Food truck markers (van icons) should be visible on the map
   - **Previous behavior**: No markers appeared on Android

4. **Interact with markers**:
   - Tap on a marker
   - Verify it responds to touch
   - Check that marker details/popup appears

5. **Test marker movement** (if applicable):
   - If food trucks are moving, observe marker animation
   - Markers should smoothly move and rotate

6. **Compare with iOS**:
   - Run the same test on iOS
   - Markers should appear and behave identically

**Success Criteria**:
- ✅ VehicleMarker (food truck icons) visible on map
- ✅ Markers appear at correct coordinates
- ✅ Markers are tappable and interactive
- ✅ Marker animations work smoothly (if applicable)
- ✅ Behavior matches iOS version

### Test 3: Combined Scenario

**Steps**:
1. **Fresh app launch**:
   - Force close the app
   - Clear app data (optional, for thorough testing)
   - Launch the app

2. **Navigate to FoodTruckScreen**:
   - Go through normal user flow to reach the map

3. **Observe both fixes together**:
   - Map should load seamlessly (no West Africa flash)
   - Food truck markers should appear immediately
   - Overall experience should be smooth and professional

4. **Test edge cases**:
   - **Slow network**: Test with throttled network to ensure loading states work
   - **No location permission**: Verify graceful handling
   - **No food trucks available**: Check that map still loads correctly

**Success Criteria**:
- ✅ Seamless user experience from launch to map view
- ✅ No visual glitches or flashes
- ✅ All markers visible and interactive
- ✅ Experience matches or exceeds iOS quality

## Troubleshooting

### If map still shows West Africa flash:

1. **Verify clean build**:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx react-native run-android
   ```

2. **Check currentLocation state**:
   - Add console.log to verify currentLocation is being set
   - Ensure location permissions are granted

3. **Check Platform.OS detection**:
   - Verify `Platform.OS === 'android'` is working correctly

### If VehicleMarker still not rendering:

1. **Check console for errors**:
   - Look for image loading errors
   - Check for coordinate validation issues

2. **Verify marker data**:
   - Ensure `vehicle.getAttribute('location.coordinates.0')` and `.1` return valid numbers
   - Check that `avatarUrl` or default image is accessible

3. **Test with simple Marker**:
   - Temporarily replace VehicleMarker with a simple Marker to isolate the issue

4. **Check tracksViewChanges**:
   - Add console.log to verify `trackViews` is `false` on Android

## Performance Testing

### Map Performance:
- **Smooth panning**: Map should pan smoothly without lag
- **Zoom responsiveness**: Zoom in/out should be responsive
- **Marker rendering**: Multiple markers should render without performance degradation

### Memory Usage:
- Monitor memory usage during map interactions
- Ensure no memory leaks when navigating away from map

## Regression Testing

Verify these existing features still work:

1. **Current location marker** (home icon):
   - Should appear at user's location
   - Tappable and shows location details

2. **Zone polygon**:
   - Service zone should render correctly
   - Proper colors and transparency

3. **Map interactions**:
   - Pan, zoom, rotate all work
   - Marker press events fire correctly

4. **Navigation**:
   - Back button works
   - Screen transitions are smooth

## Platform Comparison Checklist

Test the same scenarios on both platforms and verify:

| Feature | iOS | Android | Match? |
|---------|-----|---------|--------|
| Map loads without flash | ✓ | ✓ | ✓ |
| VehicleMarkers visible | ✓ | ✓ | ✓ |
| Marker animations smooth | ✓ | ✓ | ✓ |
| Marker press events | ✓ | ✓ | ✓ |
| Current location marker | ✓ | ✓ | ✓ |
| Zone polygon rendering | ✓ | ✓ | ✓ |
| Overall UX quality | ✓ | ✓ | ✓ |

## Expected Outcomes

After these fixes:
- ✅ Android UX matches iOS quality
- ✅ No more "android is a fight at every step" frustrations
- ✅ Professional, seamless map experience
- ✅ All markers render correctly
- ✅ Ready for 16 KB page size testing and Google Play submission

## Next Steps After Testing

1. **If tests pass**:
   - Proceed with 16 KB page size verification
   - Test on Android 16 emulator with 16 KB config
   - Prepare for Google Play submission

2. **If issues remain**:
   - Document specific scenarios that fail
   - Check console logs for errors
   - Review component lifecycle and state management
   - Consider additional platform-specific adjustments

## Notes

- These fixes are **Android-specific** and maintain iOS behavior
- Changes follow the centralized platform handling approach (using `Platform.OS` checks)
- Consistent with the `platform-theme.ts` utility pattern
- No impact on iOS functionality
- Fixes address root causes, not symptoms

## Related Files

- `src/screens/FoodTruckScreen.tsx` - Map flash fix
- `src/components/TrackingMarker.tsx` - Marker rendering fix
- `src/components/VehicleMarker.tsx` - Uses TrackingMarker
- `src/utils/platform-theme.ts` - Platform-specific theme utility

## Commit Reference

Branch: `feature/android-16kb-compliance`
Commit: "Fix Android map flash and VehicleMarker rendering issues"
