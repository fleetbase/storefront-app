import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { Animated, Easing } from 'react-native';
import { Image } from 'tamagui';
import MapView, { Marker, AnimatedRegion } from 'react-native-maps';
import { isObject } from '../utils';
import { SvgCssUri } from 'react-native-svg/css';

const AnimatedMarker = Animated.createAnimatedComponent(Marker);

const TrackingMarker = forwardRef(
    ({ coordinate, imageSource, size = { width: 50, height: 50 }, moveDuration = 1000, initialRotation = 0, baseRotation = 0, rotationDuration = 500 }, ref) => {
        // Set up the animated region for position
        const position = useRef(
            new AnimatedRegion({
                latitude: coordinate.latitude,
                longitude: coordinate.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            })
        ).current;

        // Animated value for rotation
        const rotation = useRef(new Animated.Value(initialRotation)).current;

        // Function to smoothly move the marker to a new coordinate
        const move = (newLatitude, newLongitude, duration = moveDuration) => {
            position
                .timing({
                    latitude: newLatitude,
                    longitude: newLongitude,
                    duration,
                    useNativeDriver: false,
                    easing: Easing.linear,
                })
                .start();
        };

        // Function to rotate the marker to a new heading
        const rotate = (newHeading, duration = rotationDuration) => {
            const currentRotation = rotation.__getValue();
            let delta = newHeading - currentRotation;
            // Adjust delta for shortest rotation direction
            if (Math.abs(delta) > 180) {
                delta = delta - 360 * Math.sign(delta);
            }
            const finalRotation = (currentRotation + delta) % 360;

            Animated.timing(rotation, {
                toValue: finalRotation,
                duration,
                easing: Easing.linear,
                useNativeDriver: false,
            }).start();
        };

        // Expose move and rotate via ref
        useImperativeHandle(ref, () => ({
            move,
            rotate,
        }));

        // Determine if the image source is an SVG
        const isRemoteSvg = isObject(imageSource) && typeof imageSource.uri === 'string' && imageSource.uri.toLowerCase().endsWith('.svg');

        return (
            <AnimatedMarker coordinate={position}>
                <Animated.View
                    style={{
                        transform: [
                            {
                                rotate: `${baseRotation}deg`,
                            },
                            {
                                rotate: rotation.interpolate({
                                    inputRange: [0, 360],
                                    outputRange: ['0deg', '360deg'],
                                }),
                            },
                        ],
                    }}
                >
                    {isRemoteSvg ? (
                        <SvgCssUri uri={imageSource.uri} width={size.width} height={size.height} />
                    ) : (
                        <Image source={imageSource} style={{ width: size.width, height: size.height }} resizeMode='contain' />
                    )}
                </Animated.View>
            </AnimatedMarker>
        );
    }
);

export default TrackingMarker;
