# VehicleMarker Android Rendering Issue - Debugging Guide

## Current Status

- ✅ Map West Africa flash: **FIXED**
- ❌ VehicleMarker not rendering on Android: **INVESTIGATING**
- ✅ iOS markers: **Working perfectly**

## Debug Steps Added

### 1. Debug Logging

Added comprehensive logging to both components:

**VehicleMarker.tsx** logs:
- Vehicle ID
- Raw latitude/longitude from vehicle data
- Processed coordinates after `makeCoordinatesFloat()`
- Coordinate validity check
- Avatar source (remote URL or local image)
- Heading value

**TrackingMarker.tsx** logs:
- Received coordinate prop
- Plain coordinate state
- Coordinate validity
- Image source type (SVG or image)
- `trackViews` state (should be `false` on Android)
- Platform OS

### 2. Test with Debug Logs

Run the app on Android and check console output:

```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

Navigate to FoodTruckScreen and look for:
- `[VehicleMarker Debug]` logs
- `[TrackingMarker Debug]` logs

## Common Android Marker Issues

### Issue 1: Invalid Coordinates

**Symptoms**: Markers don't appear, coordinates are NaN or undefined

**Check**:
```javascript
console.log('[VehicleMarker Debug]', {
    rawLatitude: latitude,  // Should be a number
    rawLongitude: longitude,  // Should be a number
    coordValid: coord && !isNaN(coord.latitude) && !isNaN(coord.longitude),  // Should be true
});
```

**Fix**: Ensure vehicle data has valid `location.coordinates` array with [longitude, latitude]

---

### Issue 2: Coordinate Format (Strings vs Numbers)

**Symptoms**: Coordinates look correct but markers don't render

**Check**: Are coordinates strings instead of numbers?
```javascript
typeof latitude === 'string'  // Should be false
```

**Fix**: `makeCoordinatesFloat()` should handle this, but verify it's being called

---

### Issue 3: FastImage Loading Issues on Android

**Symptoms**: Local image markers don't appear, remote URL markers might work

**Check**:
```javascript
avatarSource: avatarUrl ? { uri: avatarUrl } : require('../../assets/images/vehicles/light_commercial_van.png')
```

**Potential Fix**: Replace FastImage with standard Image component on Android:

```typescript
// In TrackingMarker.tsx
import { Image as RNImage } from 'react-native';

// Replace FastImage with:
{Platform.OS === 'android' ? (
    <RNImage 
        source={imageSource} 
        style={{ width: size.width, height: size.height }} 
        resizeMode="contain"
        onLoadEnd={() => setSvgLoading(false)}
    />
) : (
    <FastImage 
        source={imageSource} 
        style={{ width: size.width, height: size.height }} 
        resizeMode={FastImage.resizeMode.contain}
        onLoadEnd={() => setSvgLoading(false)}
    />
)}
```

---

### Issue 4: AnimatedRegion Initialization

**Symptoms**: Markers don't appear or appear at wrong location

**Check**: Initial coordinate values when AnimatedRegion is created

**Potential Issue**: If `coordinate` prop has invalid values on initial render, AnimatedRegion might fail

**Potential Fix**: Add validation before creating AnimatedRegion:

```typescript
const animatedRegion = useRef(
    new AnimatedRegion({
        latitude: coordinate?.latitude || 0,
        longitude: coordinate?.longitude || 0,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    })
).current;
```

---

### Issue 5: Marker Anchor Point

**Symptoms**: Markers might be rendering but positioned off-screen

**Check**: Current anchor is `{ x: 0.5, y: 0.5 }` (center)

**Test**: Try different anchor values:
```typescript
anchor={{ x: 0.5, y: 1.0 }}  // Bottom center
```

---

### Issue 6: tracksViewChanges Still Causing Issues

**Symptoms**: Even with `false` on Android, markers don't appear

**Check**: Verify `trackViews` state in logs - should be `false` on Android

**Alternative Fix**: Force `tracksViewChanges={false}` directly:

```typescript
<AnimatedMarker 
    coordinate={makeCoordinatesFloat(plainCoordinate)} 
    onPress={onPress} 
    anchor={ANCHOR} 
    flat={true} 
    rotation={nativeRotation} 
    tracksViewChanges={Platform.OS === 'android' ? false : trackViews}
>
```

---

### Issue 7: Marker Size Too Large/Small

**Symptoms**: Markers exist but aren't visible due to size issues

**Check**: Current size is `{ width: 50, height: 50 }`

**Test**: Try larger size temporarily:
```typescript
size={{ width: 80, height: 80 }}
```

---

### Issue 8: Z-Index or Rendering Order

**Symptoms**: Markers are rendered but hidden behind other elements

**Check**: MapView rendering order

**Test**: Ensure VehicleMarkers are rendered after other map elements (Polygons, etc.)

---

## Isolation Testing

### Test 1: Simple Marker

Created `SimpleTestMarker.tsx` - a basic marker with no animations or custom images.

**Usage in FoodTruckScreen.tsx**:

```typescript
import SimpleTestMarker from '../components/SimpleTestMarker';

// Replace VehicleMarker temporarily:
{isArray(availableFoodTrucks) &&
    availableFoodTrucks.map((foodTruck) => (
        <SimpleTestMarker
            key={foodTruck.id}
            coordinate={{ 
                latitude: foodTruck.vehicle?.location?.coordinates?.[1] || 1.3521, 
                longitude: foodTruck.vehicle?.location?.coordinates?.[0] || 103.8198 
            }}
            title={`Truck ${foodTruck.vehicle?.plate_number}`}
            onPress={() => handlePressFoodTruck(foodTruck)}
        />
    ))}
```

**If SimpleTestMarker works**: Issue is in TrackingMarker/VehicleMarker complexity
**If SimpleTestMarker fails**: Issue is with MapView configuration or coordinates

---

### Test 2: Hardcoded Marker

Add a hardcoded marker to FoodTruckScreen to verify MapView can render markers at all:

```typescript
<Marker 
    coordinate={{ latitude: 1.3521, longitude: 103.8198 }} 
    title="Test Marker"
>
    <View style={{ width: 40, height: 40, backgroundColor: 'red', borderRadius: 20 }} />
</Marker>
```

**If this works**: Issue is with VehicleMarker data or implementation
**If this fails**: Issue is with MapView setup on Android

---

## Potential Root Causes (Ranked by Likelihood)

1. **FastImage Android incompatibility** (Most likely)
   - FastImage has known Android issues with local assets
   - Solution: Use standard Image component on Android

2. **Invalid coordinate initialization** (Likely)
   - AnimatedRegion created with NaN or undefined values
   - Solution: Add validation before AnimatedRegion creation

3. **tracksViewChanges timing** (Possible)
   - Even with `false`, there might be a timing issue
   - Solution: Force false directly in JSX

4. **Image asset path** (Possible)
   - require() path might not resolve on Android
   - Solution: Verify asset exists and path is correct

5. **AnimatedRegion Android bug** (Less likely)
   - AnimatedRegion might not work properly on Android
   - Solution: Use regular Marker without animation

6. **MapView configuration** (Unlikely, since simple markers should work)
   - Something in MapView setup prevents markers
   - Solution: Check MapView props

---

## Next Steps

1. **Run app with debug logs** and share console output
   - Look for `[VehicleMarker Debug]` and `[TrackingMarker Debug]`
   - Check for any errors or warnings

2. **Test SimpleTestMarker**
   - Replace VehicleMarker temporarily
   - If it works, issue is in TrackingMarker

3. **Test hardcoded Marker**
   - Add a simple Marker with hardcoded coordinates
   - Verifies MapView can render markers

4. **Based on findings, apply targeted fix**:
   - Replace FastImage on Android
   - Fix coordinate validation
   - Simplify TrackingMarker for Android
   - Or other solution based on logs

---

## Quick Fixes to Try

### Quick Fix 1: Replace FastImage on Android

```typescript
// In TrackingMarker.tsx, replace FastImage section:
{Platform.OS === 'android' ? (
    <Image 
        source={imageSource} 
        style={{ width: size.width, height: size.height }} 
        resizeMode="contain"
    />
) : (
    <FastImage 
        source={imageSource} 
        style={{ width: size.width, height: size.height }} 
        resizeMode={FastImage.resizeMode.contain}
        onLoadEnd={() => setSvgLoading(false)}
    />
)}
```

### Quick Fix 2: Force tracksViewChanges False

```typescript
// In TrackingMarker.tsx:
<AnimatedMarker 
    coordinate={makeCoordinatesFloat(plainCoordinate)} 
    onPress={onPress} 
    anchor={ANCHOR} 
    flat={true} 
    rotation={nativeRotation} 
    tracksViewChanges={false}  // Force false always
>
```

### Quick Fix 3: Validate Coordinates

```typescript
// In VehicleMarker.tsx, before return:
if (!coord || isNaN(coord.latitude) || isNaN(coord.longitude)) {
    console.warn('[VehicleMarker] Invalid coordinates, not rendering:', coord);
    return null;
}
```

### Quick Fix 4: Simplify for Android

```typescript
// In VehicleMarker.tsx, return different marker for Android:
if (Platform.OS === 'android') {
    return (
        <Marker 
            coordinate={coord}
            onPress={props.onPress}
            flat={true}
            rotation={heading}
        >
            <View style={{ width: 50, height: 50, backgroundColor: 'blue', borderRadius: 25 }} />
        </Marker>
    );
}

return <TrackingMarker ... />;  // iOS uses full TrackingMarker
```

---

## Expected Console Output

When working correctly, you should see:

```
[VehicleMarker Debug] {
  vehicleId: "abc123",
  rawLatitude: 1.3521,
  rawLongitude: 103.8198,
  processedCoord: { latitude: 1.3521, longitude: 103.8198 },
  coordValid: true,
  avatarUrl: null,
  avatarSource: "local",
  heading: 45
}

[TrackingMarker Debug] {
  coordinate: { latitude: 1.3521, longitude: 103.8198 },
  plainCoordinate: { latitude: 1.3521, longitude: 103.8198 },
  coordValid: true,
  imageSource: "image",
  size: { width: 50, height: 50 },
  trackViews: false,
  platform: "android"
}
```

---

## Files to Check

- `src/components/VehicleMarker.tsx` - Main marker component
- `src/components/TrackingMarker.tsx` - Animated marker implementation
- `src/components/SimpleTestMarker.tsx` - Simple test marker (created)
- `src/screens/FoodTruckScreen.tsx` - Where markers are rendered
- `assets/images/vehicles/light_commercial_van.png` - Default marker image

---

## Related Issues

- react-native-maps: https://github.com/react-native-maps/react-native-maps/issues
- FastImage Android issues: https://github.com/DylanVann/react-native-fast-image/issues
- AnimatedRegion Android: Search for "AnimatedRegion android" in react-native-maps issues

---

## Contact

Share the console logs and I'll help identify the exact issue and apply the right fix!
