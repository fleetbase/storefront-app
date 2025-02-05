import React, { forwardRef, useRef, useImperativeHandle, useState, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import { Spinner, YStack } from 'tamagui';
import FastImage from 'react-native-fast-image';
import MapView, { Marker, AnimatedRegion } from 'react-native-maps';
import { isObject } from '../utils';
import { SvgCssUri } from 'react-native-svg/css';

// Create an animated version of Marker
const AnimatedMarker = Animated.createAnimatedComponent(Marker);

const TrackingMarker = forwardRef(
    ({ coordinate, imageSource, size = { width: 50, height: 50 }, moveDuration = 1000, initialRotation = 0, baseRotation = 0, rotationDuration = 500, onPress, children }, ref) => {
        const [svgLoading, setSvgLoading] = useState(true);

        // Set up the animated region for position
        const animatedRegion = useRef(
            new AnimatedRegion({
                latitude: coordinate.latitude,
                longitude: coordinate.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            })
        ).current;

        // Maintain a plain coordinate state that is updated from the AnimatedRegion.
        const [plainCoordinate, setPlainCoordinate] = useState({
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
        });

        // Listen to updates from animatedRegion and update plainCoordinate.
        useEffect(() => {
            const listener = animatedRegion.addListener((region) => {
                setPlainCoordinate({
                    latitude: region.latitude,
                    longitude: region.longitude,
                });
            });
            return () => animatedRegion.removeListener(listener);
        }, [animatedRegion]);

        // Animated value for rotation.
        const rotation = useRef(new Animated.Value(initialRotation)).current;

        // Function to smoothly move the marker.
        const move = (newLatitude, newLongitude, duration = moveDuration) => {
            animatedRegion
                .timing({
                    latitude: newLatitude,
                    longitude: newLongitude,
                    duration,
                    useNativeDriver: false,
                    easing: Easing.linear,
                })
                .start();
        };

        // Function to rotate the marker.
        const rotate = (newHeading, duration = rotationDuration) => {
            const currentRotation = rotation.__getValue();
            let delta = newHeading - currentRotation;
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

        // Expose move and rotate via ref.
        useImperativeHandle(ref, () => ({
            move,
            rotate,
        }));

        // Determine if the image source is an SVG.
        const isRemoteSvg = isObject(imageSource) && typeof imageSource.uri === 'string' && imageSource.uri.toLowerCase().endsWith('.svg');

        const onSvgLoadingError = (e) => {
            setSvgLoading(false);
        };

        const onSvgLoaded = () => {
            setSvgLoading(false);
        };

        return (
            <AnimatedMarker coordinate={plainCoordinate} onPress={onPress}>
                <Animated.View
                    style={{
                        transform: [
                            { rotate: `${baseRotation}deg` },
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
                        <YStack
                            style={{
                                position: 'relative',
                                width: size.width,
                                height: size.height,
                            }}
                        >
                            <SvgCssUri uri={imageSource.uri} width={size.width} height={size.height} onError={onSvgLoadingError} onLoad={onSvgLoaded} />
                            {svgLoading && (
                                <YStack
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Spinner color='$textPrimary' size={size.width} />
                                </YStack>
                            )}
                        </YStack>
                    ) : (
                        <FastImage source={imageSource} style={{ width: size.width, height: size.height }} resizeMode={FastImage.resizeMode.contain} />
                    )}
                </Animated.View>
                {children && <YStack>{children}</YStack>}
            </AnimatedMarker>
        );
    }
);

export default TrackingMarker;
