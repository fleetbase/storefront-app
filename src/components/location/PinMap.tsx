import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import { faLocationCrosshairs } from '@fortawesome/free-solid-svg-icons';
import { YStack } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCoordinates, getLiveLocation } from '../../utils/location';
import { storefrontConfig } from '../../utils';
import { regionAround, type Region } from '../../commerce/places';
import { IconButton } from '../../ui';
import LocationMarker from '../LocationMarker';

export type PinMapHandle = { moveTo: (region: Region, duration?: number) => void };

const MOVE_MS = 500;

/**
 * A map with a pin fixed at its centre. Dragging the map lifts the pin; when the map
 * settles the pin drops and `onSettle` gets the new centre. It fills its parent, so
 * size the parent to the visible map area. "Locate me" glides the map
 * to the device's position.
 */
export const PinMap = forwardRef<PinMapHandle, { initialRegion: Region; onSettle: (region: Region) => void; onMoveStart?: () => void; locateTop?: number }>(function PinMap(
    { initialRegion, onSettle, onMoveStart, locateTop = 16 },
    ref
) {
    const { t } = useLanguage();
    const map = useRef<any>(null);
    const [lifted, setLifted] = useState(false);
    const [locating, setLocating] = useState(false);
    const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const lift = () => {
        if (!lifted) {
            setLifted(true);
            onMoveStart?.();
        }
    };

    const moveTo = (region: Region, duration = MOVE_MS) => {
        lift();
        map.current?.animateToRegion?.(region, duration);
        // Some platforms don't report the end of a programmatic move; settle anyway.
        if (settleTimer.current) clearTimeout(settleTimer.current);
        settleTimer.current = setTimeout(() => {
            setLifted(false);
            onSettle(region);
        }, duration + 50);
    };

    useImperativeHandle(ref, () => ({ moveTo }));

    const locate = async () => {
        setLocating(true);
        try {
            const place = await getLiveLocation();
            if (place) moveTo(regionAround(getCoordinates(place), undefined, initialRegion.latitudeDelta));
        } finally {
            setLocating(false);
        }
    };

    return (
        <View style={StyleSheet.absoluteFill}>
            <MapView
                ref={map}
                style={StyleSheet.absoluteFill}
                initialRegion={initialRegion}
                mapType={storefrontConfig('defaultMapType', 'standard')}
                onPanDrag={lift}
                onRegionChange={lift}
                onRegionChangeComplete={(region: Region) => {
                    if (settleTimer.current) clearTimeout(settleTimer.current);
                    setLifted(false);
                    onSettle(region);
                }}
                showsUserLocation
                showsMyLocationButton={false}
                toolbarEnabled={false}
            />
            {/* The pin's tip sits on the map centre. */}
            <View pointerEvents='none' style={[StyleSheet.absoluteFill, styles.center]} accessibilityElementsHidden importantForAccessibility='no-hide-descendants'>
                <View style={styles.pin}>
                    <LocationMarker lifted={lifted} />
                </View>
            </View>
            <YStack position='absolute' right={16} top={locateTop} zIndex={1000}>
                <IconButton icon={faLocationCrosshairs} variant='floating' size={44} disabled={locating} accessibilityLabel={t('Places.locateMe')} onPress={locate} />
            </YStack>
        </View>
    );
});

const styles = StyleSheet.create({
    // Above the web map's own layers (Leaflet panes sit at z-index 400+).
    center: { alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    // The marker is about 70pt tall; lift it so its tip, not its middle, marks the centre.
    pin: { marginBottom: 70 },
});
