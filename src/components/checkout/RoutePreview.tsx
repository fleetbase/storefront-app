import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import useStorefront from '../../hooks/use-storefront';
import { getCoordinates } from '../../utils/location';
import { storefrontConfig } from '../../utils';
import { arcPoints, initials, regionFor, straightDistance, toLatLng, type LatLng } from '../../commerce/route-preview';
import { UIText, elevation, formatDistance, radius } from '../../ui';

export type RouteStore = { storeId: string; storeLocationId: string; name: string | null };
type Origin = { key: string; name: string | null; point: LatLng };

export const ROUTE_PREVIEW_HEIGHT = 120;

/** Where each store's location is, looked up once per checkout; stores that fail are left out. */
function useOrigins(stores: RouteStore[]): Origin[] {
    const { storefront } = useStorefront();
    const adapter = storefront?.getAdapter?.();
    const [origins, setOrigins] = useState<Origin[]>([]);
    const signature = stores.map((store) => `${store.storeId}:${store.storeLocationId}`).join('|');

    useEffect(() => {
        if (!adapter || stores.length === 0) {
            setOrigins([]);
            return;
        }
        let active = true;
        Promise.all(
            stores.map(async (store): Promise<Origin | null> => {
                try {
                    const json: any = await adapter.get(`locations/${store.storeLocationId}`, { store: store.storeId });
                    const coordinates = json?.place?.location?.coordinates;
                    // GeoJSON is [longitude, latitude].
                    const point = Array.isArray(coordinates) ? toLatLng([coordinates[1], coordinates[0]]) : null;
                    return point ? { key: store.storeLocationId, name: store.name, point } : null;
                } catch {
                    return null;
                }
            })
        ).then((found) => {
            if (active) setOrigins(found.filter((origin): origin is Origin => origin !== null));
        });
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adapter, signature]);

    return origins;
}

/**
 * A short, still map at the top of the delivery address card: each store in the cart
 * joined to the delivery pin by a dashed line, with the straight-line distance. Tapping
 * it changes the address. Until the stores' locations load, or if they can't be found,
 * nothing is shown and the card looks as it did before.
 */
export function RoutePreview({ stores, destination, unavailable = false, onPress }: { stores: RouteStore[]; destination: any; unavailable?: boolean; onPress: () => void }) {
    const { t } = useLanguage();
    const theme = useTheme();
    const origins = useOrigins(stores);
    const target = useMemo(() => toLatLng(destination ? getCoordinates(destination) : null), [destination]);
    // Frame the arcs too, so their bow stays inside the strip.
    const region = useMemo(() => (target && origins.length ? regionFor([target, ...origins.flatMap((origin) => arcPoints(origin.point, target))]) : null), [target, origins]);

    if (!target || !region) return null;

    const distance = formatDistance(Math.max(...origins.map((origin) => straightDistance(origin.point, target)))) ?? '';
    const chip = origins.length > 1 ? t('Checkout.routeStores', { count: origins.length, distance }) : t('Checkout.routeFrom', { distance, store: origins[0]!.name ?? '' });
    const lineColor = unavailable ? theme.errorForeground.val : theme.primary.val;
    const pinColor = theme.primary.val;

    return (
        <Pressable onPress={onPress} accessibilityRole='button' accessibilityLabel={t('Checkout.routeLabel', { route: chip })} style={{ height: ROUTE_PREVIEW_HEIGHT }}>
            <View pointerEvents='none' style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility='no-hide-descendants'>
                {/* Remounted when the stores or address move, so the map reframes. */}
                <MapView
                    key={`${region.latitude},${region.longitude},${region.latitudeDelta}`}
                    style={StyleSheet.absoluteFill}
                    initialRegion={region}
                    mapType={storefrontConfig('defaultMapType', 'standard')}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    toolbarEnabled={false}
                    liteMode={Platform.OS === 'android'}
                >
                    {origins.map((origin) => (
                        <Polyline key={`line-${origin.key}`} coordinates={arcPoints(origin.point, target)} strokeColor={lineColor} strokeWidth={3} lineDashPattern={[2, 8]} />
                    ))}
                    {origins.map((origin) => (
                        <Marker
                            key={origin.key}
                            coordinate={origin.point}
                            tracksViewChanges={false}
                            {...({ webIconHtml: storeTileHtml(origin.name, theme.textPrimary.val), webIconSize: 30 } as object)}
                        >
                            <YStack
                                width={30}
                                height={30}
                                borderRadius={9}
                                backgroundColor='$textPrimary'
                                borderWidth={2}
                                borderColor='$background'
                                alignItems='center'
                                justifyContent='center'
                                style={elevation.floating}
                            >
                                <UIText variant='label' style={{ color: theme.background.val, fontSize: 10, letterSpacing: 0 }}>
                                    {initials(origin.name)}
                                </UIText>
                            </YStack>
                        </Marker>
                    ))}
                    <Marker coordinate={target} tracksViewChanges={false} {...({ webIconHtml: pinHtml(pinColor), webIconSize: 22 } as object)}>
                        <YStack width={22} height={22} borderRadius={11} backgroundColor='$primary' borderWidth={4} borderColor='$background' style={elevation.floating} />
                    </Marker>
                </MapView>
            </View>
            <YStack position='absolute' left={10} bottom={10} paddingHorizontal={10} paddingVertical={4} borderRadius={radius.pill} backgroundColor='$background' style={elevation.card}>
                <UIText variant='captionStrong' numberOfLines={1}>
                    {chip}
                </UIText>
            </YStack>
        </Pressable>
    );
}

// Leaflet on the web draws markers from HTML rather than React views.
function storeTileHtml(name: string | null, color: string): string {
    return `<div style="width:30px;height:30px;border-radius:9px;background:${color};border:2px solid #fff;box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:#fff;font:800 10px system-ui">${initials(name)}</div>`;
}

function pinHtml(color: string): string {
    return `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:4px solid #fff;box-sizing:border-box;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`;
}
