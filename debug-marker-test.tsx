// Debug script to check VehicleMarker rendering issues
// Add this temporarily to VehicleMarker.tsx to debug

import React, { useEffect } from 'react';

// Add these console.logs to VehicleMarker component:

useEffect(() => {
    console.log('=== VehicleMarker Debug ===');
    console.log('Vehicle ID:', vehicle.id);
    console.log('Raw latitude:', latitude);
    console.log('Raw longitude:', longitude);
    console.log('Processed coord:', coord);
    console.log('Avatar URL:', avatarUrl);
    console.log('Avatar Source:', avatarSource);
    console.log('Heading:', heading);
    console.log('Coord is valid:', coord && !isNaN(coord.latitude) && !isNaN(coord.longitude));
    console.log('===========================');
}, [vehicle.id, latitude, longitude, coord, avatarUrl, avatarSource, heading]);

// Things to check:
// 1. Are latitude/longitude valid numbers?
// 2. Is coord properly formatted { latitude: number, longitude: number }?
// 3. Is avatarSource valid (either require() or {uri: string})?
// 4. Are there any NaN values?

// Common Android issues with react-native-maps markers:
// - Coordinate values must be numbers, not strings
// - Image source must be valid (check if require() path is correct)
// - Marker size must be reasonable (50x50 should be fine)
// - tracksViewChanges issue (already addressed)
// - Marker might be rendering but off-screen (check coordinate values)
// - FastImage might have Android-specific loading issues

// Test with a simple Marker first:
// <Marker 
//   coordinate={{ latitude: 1.3521, longitude: 103.8198 }} 
//   title="Test"
// />

// If simple Marker works but TrackingMarker doesn't, the issue is in TrackingMarker
// If simple Marker also doesn't work, it's a deeper MapView configuration issue
