import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import { SvgCssUri } from 'react-native-svg/css';
import FastImage from 'react-native-fast-image';
import { Spinner, YStack } from 'tamagui';
import { Vehicle } from '@fleetbase/sdk';
import { isObject } from '../utils';

/**
 * VehicleAvatar
 *
 * Renders a vehicle's avatar image using the same branching logic as
 * TrackingMarker: remote SVG URIs are rendered via SvgCssUri (with a
 * loading spinner while the SVG fetches), and all other sources — remote
 * raster URLs or the local fallback PNG — are rendered via FastImage with
 * contain resize mode.
 *
 * Props:
 *   vehicle  — a Vehicle model instance (already instantiated via
 *              `new Vehicle(serializedData, adapter)`). The component calls
 *              `vehicle.getAttribute('avatar_url')` to resolve the source,
 *              matching the pattern used in VehicleMarker.
 *   size     — optional { width, height } object (default 44×44).
 */

const DEFAULT_SIZE = { width: 44, height: 44 };

type VehicleAvatarProps = {
    vehicle: InstanceType<typeof Vehicle>;
    size?: { width: number; height: number };
};

const VehicleAvatar = ({ vehicle, size = DEFAULT_SIZE }: VehicleAvatarProps) => {
    const [svgLoading, setSvgLoading] = useState(true);

    const avatarUrl = vehicle.getAttribute('avatar_url');
    const avatarSource = avatarUrl
        ? { uri: avatarUrl }
        : require('../../assets/images/vehicles/light_commercial_van.png');

    // Mirrors the isRemoteSvg check in TrackingMarker (line 99)
    const isRemoteSvg =
        isObject(avatarSource) &&
        typeof (avatarSource as { uri: string }).uri === 'string' &&
        (avatarSource as { uri: string }).uri.toLowerCase().endsWith('.svg');

    const onSvgLoaded = () => setSvgLoading(false);
    const onSvgError = () => setSvgLoading(false);
    const onImageLoaded = () => setSvgLoading(false);

    if (isRemoteSvg) {
        return (
            <View
                style={{
                    width: size.width,
                    height: size.height,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <SvgCssUri
                    uri={(avatarSource as { uri: string }).uri}
                    width={size.width}
                    height={size.height}
                    onLoad={onSvgLoaded}
                    onError={onSvgError}
                />
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
            </View>
        );
    }

    return (
        <View
            style={{
                width: size.width,
                height: size.height,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <FastImage
                source={avatarSource}
                style={{ width: size.width, height: size.height }}
                resizeMode={FastImage.resizeMode.contain}
                onLoadEnd={onImageLoaded}
            />
        </View>
    );
};

export default VehicleAvatar;
