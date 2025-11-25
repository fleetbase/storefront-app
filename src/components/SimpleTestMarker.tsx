import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Marker } from 'react-native-maps';

/**
 * Simple test marker to isolate Android rendering issues
 * 
 * Usage in FoodTruckScreen.tsx:
 * Replace VehicleMarker temporarily with:
 * 
 * <SimpleTestMarker 
 *   coordinate={{ latitude: 1.3521, longitude: 103.8198 }}
 *   title="Test Truck"
 * />
 */

const SimpleTestMarker = ({ coordinate, title = 'Test', onPress }) => {
    console.log('[SimpleTestMarker]', { coordinate, platform: Platform.OS });

    return (
        <Marker
            coordinate={coordinate}
            onPress={onPress}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
        >
            <View
                style={{
                    width: 50,
                    height: 50,
                    backgroundColor: 'red',
                    borderRadius: 25,
                    borderWidth: 3,
                    borderColor: 'white',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                    🚚
                </Text>
            </View>
        </Marker>
    );
};

export default SimpleTestMarker;
