import React, { forwardRef, useRef, useImperativeHandle, useState, useEffect } from 'react';
import { Animated, Easing, View, Platform } from 'react-native';
import MapView, { Marker, AnimatedRegion } from 'react-native-maps';
import { SvgCssUri } from 'react-native-svg/css';
import FastImage from 'react-native-fast-image';
import { Spinner, YStack } from 'tamagui';
import { isObject } from '../utils';
import { makeCoordinatesFloat } from '../utils/location';

const AnimatedMarker = Animated.createAnimatedComponent(Marker);
const ANCHOR = { x: 0.5, y: 0.5 };

const TrackingMarker = forwardRef(
    (
        {
            coordinate,
            imageSource,
            size = { width: 50, height: 50 },
            moveDuration = 1000,
            initialRotation = 0,
            baseRotation = 0,
            rotationDuration = 500,
            onPress,
            children,
            mapBearing = 0,
            providerIsGoogle = true,
        },
        ref
    ) => {
        const animatedRegion = useRef(
            new AnimatedRegion({
                latitude: coordinate.latitude,
                longitude: coordinate.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            })
        ).current;

        const [plainCoordinate, setPlainCoordinate] = useState({
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
        });

        useEffect(() => {
            const listener = animatedRegion.addListener((r) => {
                setPlainCoordinate({ latitude: r.latitude, longitude: r.longitude });
            });
            return () => animatedRegion.removeListener(listener);
        }, [animatedRegion]);

        const [heading, setHeading] = useState(initialRotation);
        const rotationAnim = useRef(new Animated.Value(initialRotation)).current;

        useEffect(() => {
            const sub = rotationAnim.addListener(({ value }) => {
                const normalized = ((value % 360) + 360) % 360;
                setHeading(normalized);
            });
            return () => {
                rotationAnim.removeAllListeners();
                if (sub) rotationAnim.removeListener(sub);
            };
        }, [rotationAnim]);

        const normalizeTurn = (fromDeg, toDeg) => {
            let d = toDeg - fromDeg;
            if (Math.abs(d) > 180) d -= 360 * Math.sign(d);
            return fromDeg + d;
        };

        const move = (lat, lng, duration = moveDuration) => {
            animatedRegion
                .timing({
                    latitude: lat,
                    longitude: lng,
                    duration,
                    easing: Easing.linear,
                    useNativeDriver: false,
                })
                .start();
        };

        const rotate = (newHeading, duration = rotationDuration) => {
            const current = rotationAnim.__getValue();
            const target = normalizeTurn(current, newHeading);
            Animated.timing(rotationAnim, {
                toValue: target,
                duration,
                easing: Easing.linear,
                useNativeDriver: false,
            }).start();
        };

        useImperativeHandle(ref, () => ({ move, rotate }));

        const [svgLoading, setSvgLoading] = useState(true);
        const [imageLoaded, setImageLoaded] = useState(false);
        const [trackViews, setTrackViews] = useState(Platform.OS === 'android' ? true : true);
        const [renderKey, setRenderKey] = useState(0);
        const isRemoteSvg = isObject(imageSource) && typeof imageSource.uri === 'string' && imageSource.uri.toLowerCase().endsWith('.svg');

        useEffect(() => {
            // On Android, keep tracksViewChanges true until image loads
            if (Platform.OS === 'android') {
                if (imageLoaded) {
                    // After image loads, wait a bit then disable tracking
                    const timer = setTimeout(() => {
                        setTrackViews(false);
                    }, 300);
                    return () => clearTimeout(timer);
                } else {
                    setTrackViews(true);
                }
            } else if (svgLoading || !!children) {
                setTrackViews(true);
            } else {
                const t = setTimeout(() => setTrackViews(false), 120);
                return () => clearTimeout(t);
            }
        }, [svgLoading, children, imageLoaded]);

        const onSvgLoaded = () => {
            setSvgLoading(false);
            setImageLoaded(true);
            if (Platform.OS === 'android') {
                // Force re-render on Android
                setRenderKey((prev) => prev + 1);
            }
        };

        const onSvgError = () => {
            setSvgLoading(false);
            setImageLoaded(true);
        };

        const onImageLoaded = () => {
            setSvgLoading(false);
            setImageLoaded(true);
            if (Platform.OS === 'android') {
                // Force re-render on Android
                setRenderKey((prev) => prev + 1);
            }
        };

        const providerSupportsRotation = providerIsGoogle;
        const nativeRotation = (((heading + baseRotation) % 360) + 360) % 360;
        const childRotation = (((heading + baseRotation - mapBearing) % 360) + 360) % 360;

        return (
            <AnimatedMarker
                key={Platform.OS === 'android' ? `marker-${renderKey}` : undefined}
                coordinate={makeCoordinatesFloat(plainCoordinate)}
                onPress={onPress}
                anchor={ANCHOR}
                flat={true}
                rotation={nativeRotation}
                tracksViewChanges={trackViews}
            >
                <YStack
                    style={{
                        width: size.width,
                        height: size.height,
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: [{ rotate: `${childRotation}deg` }],
                    }}
                    pointerEvents='none'
                >
                    {isRemoteSvg ? (
                        <>
                            <SvgCssUri uri={imageSource.uri} width={size.width} height={size.height} onLoad={onSvgLoaded} onError={onSvgError} />
                            {svgLoading && (
                                <YStack
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Spinner color='$textPrimary' size={Math.min(size.width, 24)} />
                                </YStack>
                            )}
                        </>
                    ) : (
                        <FastImage source={imageSource} style={{ width: size.width, height: size.height }} resizeMode={FastImage.resizeMode.contain} onLoadEnd={onImageLoaded} />
                    )}
                </YStack>

                {children && (
                    <View
                        pointerEvents='box-none'
                        style={{
                            position: 'absolute',
                            top: size.height,
                            minWidth: 100,
                            maxWidth: 150,
                            marginLeft: -(size.width / 2),
                        }}
                    >
                        {children}
                    </View>
                )}
            </AnimatedMarker>
        );
    }
);

export default TrackingMarker;
