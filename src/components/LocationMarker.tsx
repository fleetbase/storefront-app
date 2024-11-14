import React from 'react';
import { LinearGradient } from 'react-native-linear-gradient';
import { Square, Circle, View } from 'tamagui';

const gradientColors = ['#1d4ed8', '#3b82f6', '#60a5fa', '#60a5fa'];
const tipColor = '#60a5fa';

const LocationMarker = ({ lifted }) => {
    return (
        <View alignItems='center' justifyContent='center'>
            <View
                animation='quick'
                scale={lifted ? 1.5 : 1}
                opacity={lifted ? 0.3 : 0.2}
                width={20}
                height={5}
                backgroundColor='rgba(0, 0, 0, 0.3)'
                borderRadius={20}
                position='absolute'
                bottom={-20}
                shadowColor='#000'
                shadowRadius={lifted ? 8 : 4}
                shadowOpacity={0.5}
            />
            <View animation='bouncy' scale={lifted ? 1.1 : 1} y={lifted ? -20 : 0} alignItems='center' justifyContent='center'>
                <LinearGradient
                    colors={gradientColors}
                    style={{
                        width: 40,
                        height: 50,
                        borderRadius: 30,
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                    }}
                >
                    <Square size={40} borderRadius={30} alignItems='center' justifyContent='center' overflow='hidden'>
                        <Circle size={20} y={-5} backgroundColor='rgba(0, 0, 0, 0.8)' shadowColor='#000' shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.15} shadowRadius={3} />
                    </Square>
                </LinearGradient>
                <Square
                    size={20}
                    backgroundColor={tipColor}
                    style={{
                        position: 'absolute',
                        bottom: -4,
                        transform: [{ rotate: '45deg' }],
                    }}
                />
            </View>
        </View>
    );
};

export default LocationMarker;
