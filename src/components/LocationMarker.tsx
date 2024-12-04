import React from 'react';
import { LinearGradient } from 'react-native-linear-gradient';
import { Square, Circle, View } from 'tamagui';

const gradientColors = ['#1d4ed8', '#3b82f6', '#60a5fa', '#60a5fa'];
const tipColor = '#60a5fa';
const sizeMap = {
    xxs: 0.25,
    xs: 0.5,
    sm: 0.75,
    md: 1,
    lg: 1.5,
    xl: 2,
};

const LocationMarker = ({ lifted = false, size }) => {
    const scale = sizeMap[size] || sizeMap.md;
    const markerContainerWidth = 20 * scale;
    const markerContainerHeight = 5 * scale;
    const markerWidth = 40 * scale;
    const markerHeight = 50 * scale;
    const innerCircleSize = 20 * scale;
    const tipSize = 20 * scale;
    const shadowRadius = lifted ? 8 * scale : 4 * scale;

    return (
        <View alignItems='center' justifyContent='center'>
            <View
                animation='quick'
                scale={lifted ? 1.5 : 1}
                opacity={lifted ? 0.3 : 0.2}
                width={markerContainerWidth}
                height={markerContainerHeight}
                backgroundColor='rgba(0, 0, 0, 0.3)'
                borderRadius={20 * scale}
                position='absolute'
                bottom={-20 * scale}
                shadowColor='#000'
                shadowRadius={lifted ? 8 : 4}
                shadowOpacity={0.5}
            />
            <View animation='bouncy' scale={lifted ? 1.1 : 1} y={lifted ? -20 : 0} alignItems='center' justifyContent='center'>
                <LinearGradient
                    colors={gradientColors}
                    style={{
                        width: markerWidth,
                        height: markerHeight,
                        borderRadius: 30 * scale,
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                    }}
                >
                    <Square size={markerWidth} borderRadius={30 * scale} alignItems='center' justifyContent='center' overflow='hidden'>
                        <Circle
                            size={innerCircleSize}
                            y={-5 * scale}
                            backgroundColor='rgba(0, 0, 0, 0.8)'
                            shadowColor='#000'
                            shadowOffset={{ width: 0, height: 1 }}
                            shadowOpacity={0.15}
                            shadowRadius={3}
                        />
                    </Square>
                </LinearGradient>
                <Square
                    size={tipSize}
                    backgroundColor={tipColor}
                    style={{
                        position: 'absolute',
                        bottom: -4 * scale,
                        transform: [{ rotate: '45deg' }],
                    }}
                />
            </View>
        </View>
    );
};

export default LocationMarker;
