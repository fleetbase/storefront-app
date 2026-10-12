import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Linking, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faDiamondTurnRight, faLocationArrow, faLocationDot, faPhone, faStore, faTruck } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';
import useStorefront from '../hooks/use-storefront';
import useStoreLocations from '../hooks/use-store-locations';
import useCustomerCoordinates from '../hooks/use-customer-coordinates';
import { distanceMeters, initialRegion, isValidCoordinate, type LatLng } from '../network/map';
import { handleNavigateNewLocation, storefrontConfig, toArray } from '../utils';
import { foodTruckDisplayName } from '../utils/format';
import { Button, EmptyState, ErrorState, IconButton, SegmentedControl, Skeleton, UIText, formatDistance, initials, radius, space, storeSummary, tintFor, usesTwelveHourClock } from '../ui';

const CARD_WIDTH = 300;
const CARD_GAP = 12;
/** How far in to zoom on one place (about 2 km across). */
const PLACE_DELTA = 0.02;

type Pin = {
    key: string;
    kind: 'location' | 'truck';
    coordinate: LatLng;
    name: string;
    line: string | null;
    status: string | null;
    statusTone: 'success' | 'warning';
    distance: string | null;
    phone: string | null;
    resource: any;
};

const attr = (item: any, key: string) => (typeof item?.getAttribute === 'function' ? item.getAttribute(key) : item?.[key]);

function pointOf(place: any): LatLng | null {
    const coordinates = attr(place, 'location')?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
    const point = { latitude: Number(coordinates[1]), longitude: Number(coordinates[0]) };
    return isValidCoordinate(point) ? point : null;
}

/**
 * The store's locations on a map, with a card for each (address, today's status, distance,
 * order from here, directions, call). When the store runs food trucks, a switch shows them
 * instead, live or offline, each opening its menu.
 */
const StoreMapScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { width } = useWindowDimensions();
    const { t, locale } = useLanguage();
    const hour12 = usesTwelveHourClock(locale);
    const { storefront } = useStorefront();
    const { ownerInfo } = useStorefrontRuntime();
    const { storeLocations, updateCurrentStoreLocation, isLoadingStoreLocations, storeLocationsError, reloadStoreLocations } = useStoreLocations();
    const { point: customer } = useCustomerCoordinates();
    const [mode, setMode] = useState<'locations' | 'trucks'>('locations');
    const [trucks, setTrucks] = useState<any[]>([]);
    const [selected, setSelected] = useState(0);
    const mapRef = useRef<any>(null);
    const listRef = useRef<FlatList>(null);
    const hasTruckTab = toArray(storefrontConfig('storeNavigator.tabs')).includes('StoreFoodTruckTab');

    useEffect(() => {
        if (!storefront?.foodTrucks) return;
        let active = true;
        storefront.foodTrucks
            .query({ limit: -1 })
            .then((result: any) => active && setTrucks((Array.from(result || []) as any[]).map((truck) => (typeof truck.serialize === 'function' ? truck.serialize() : truck)).filter((truck) => truck?.vehicle)))
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [storefront]);

    const locationPins = useMemo<Pin[]>(
        () =>
            storeLocations
                .map((location: any): Pin | null => {
                    const place = attr(location, 'place');
                    const coordinate = pointOf(place);
                    if (!coordinate) return null;
                    const summary = storeSummary({ ...ownerInfo, locations: [{ hours: attr(location, 'hours') ?? [] }] }, { t, hour12 });
                    return {
                        key: location.id,
                        kind: 'location',
                        coordinate,
                        name: attr(location, 'name') || ownerInfo?.name || '',
                        line: attr(place, 'address') ?? attr(place, 'street1') ?? null,
                        status: summary.statusText,
                        statusTone: summary.muted ? 'warning' : 'success',
                        distance: customer ? formatDistance(distanceMeters(customer, coordinate)) : null,
                        phone: attr(location, 'phone') ?? ownerInfo?.phone ?? null,
                        resource: location,
                    };
                })
                .filter((pin): pin is Pin => pin !== null),
        [customer, hour12, ownerInfo, storeLocations, t]
    );

    const truckPins = useMemo<Pin[]>(
        () =>
            trucks
                .map((truck: any): Pin | null => {
                    const coordinate = pointOf(truck.vehicle);
                    if (!coordinate) return null;
                    const live = truck.vehicle?.online === true || truck.vehicle?.online === 1;
                    return {
                        key: truck.id,
                        kind: 'truck',
                        coordinate,
                        name: foodTruckDisplayName(truck),
                        line: truck.zone?.name ?? null,
                        status: live ? t('StoreMap.truckLive') : t('StoreMap.truckOffline'),
                        statusTone: live ? 'success' : 'warning',
                        distance: customer ? formatDistance(distanceMeters(customer, coordinate)) : null,
                        phone: null,
                        resource: truck,
                    };
                })
                .filter((pin): pin is Pin => pin !== null),
        [customer, t, trucks]
    );

    const pins = mode === 'trucks' ? truckPins : locationPins;
    const sortedPins = useMemo(() => (customer ? [...pins].sort((a, b) => distanceMeters(customer, a.coordinate) - distanceMeters(customer, b.coordinate)) : pins), [customer, pins]);
    const region = useMemo(() => initialRegion(customer, sortedPins.map((pin) => pin.coordinate)), [customer, sortedPins]);

    const focus = useCallback(
        (index: number, { scroll = true } = {}) => {
            const pin = sortedPins[index];
            if (!pin) return;
            setSelected(index);
            if (scroll) listRef.current?.scrollToIndex?.({ index, animated: true, viewPosition: 0.5 });
            mapRef.current?.animateToRegion?.({ ...pin.coordinate, latitudeDelta: PLACE_DELTA, longitudeDelta: PLACE_DELTA }, 350);
        },
        [sortedPins]
    );

    // Zoom in on the nearest place once places arrive, and again when switching modes.
    const framedFor = useRef<string | null>(null);
    useEffect(() => {
        const key = `${mode}:${sortedPins.length}`;
        if (sortedPins.length === 0 || framedFor.current === key) return;
        framedFor.current = key;
        setSelected(0);
        const timer = setTimeout(() => mapRef.current?.animateToRegion?.({ ...sortedPins[0].coordinate, latitudeDelta: PLACE_DELTA, longitudeDelta: PLACE_DELTA }, 400), 250);
        return () => clearTimeout(timer);
    }, [mode, sortedPins]);

    const locateMe = () => {
        if (customer) mapRef.current?.animateToRegion?.({ ...customer, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 350);
        else navigation.navigate('LocationPermission');
    };

    const directions = (pin: Pin) => {
        const { latitude, longitude } = pin.coordinate;
        const label = encodeURIComponent(pin.name);
        const url = Platform.select({
            ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
            android: `geo:0,0?q=${latitude},${longitude}(${label})`,
            default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
        });
        Linking.openURL(url as string);
    };

    const primary = (pin: Pin) => {
        if (pin.kind === 'location') {
            // Orders go to this location from now on.
            updateCurrentStoreLocation(pin.resource);
            navigation.navigate('StoreHomeTab', { screen: 'StoreHome' });
        } else if (hasTruckTab) {
            navigation.navigate('StoreFoodTruckTab', { screen: 'Catalog', params: { catalogs: pin.resource.catalogs, foodTruckId: pin.resource.id } });
        }
    };

    const markerHtml = (pin: Pin, active: boolean) => {
        const size = active ? 48 : 38;
        const border = active ? theme.primaryForeground.val : '#ffffff';
        const background = pin.statusTone === 'warning' ? '#6b7280' : tintFor(pin.name);
        return `<div style="width:${size}px;height:${size}px;border-radius:50%;border:3px solid ${border};background:${background};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.25)"><span style="font:800 ${Math.round(size * 0.3)}px system-ui,sans-serif;color:#1b2230">${initials(pin.name)}</span></div>`;
    };

    const loading = mode === 'locations' && isLoadingStoreLocations && locationPins.length === 0;

    return (
        <YStack flex={1} backgroundColor='$background'>
            {region ? (
                <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={region} showsUserLocation={Platform.OS !== 'web'} accessibilityLabel={mode === 'trucks' ? t('StoreMap.trucksLabel') : t('StoreMap.locationsLabel')}>
                    {sortedPins.map((pin, index) => (
                        <Marker
                            key={pin.key}
                            coordinate={pin.coordinate}
                            onPress={() => focus(index)}
                            accessibilityLabel={[pin.name, pin.distance, pin.status].filter(Boolean).join(', ')}
                            zIndex={index === selected ? 2 : 1}
                            {...({ webIconHtml: markerHtml(pin, index === selected), webIconSize: index === selected ? 48 : 38 } as object)}
                        >
                            <YStack
                                width={index === selected ? 48 : 38}
                                height={index === selected ? 48 : 38}
                                borderRadius={24}
                                borderWidth={3}
                                borderColor={index === selected ? '$primaryForeground' : '#ffffff'}
                                alignItems='center'
                                justifyContent='center'
                                style={{ backgroundColor: pin.statusTone === 'warning' ? '#6b7280' : tintFor(pin.name) }}
                            >
                                {pin.kind === 'truck' ? (
                                    <FontAwesomeIcon icon={faTruck} size={14} color='#1b2230' />
                                ) : (
                                    <UIText variant='captionStrong' style={{ color: '#1b2230', fontSize: index === selected ? 14 : 12 }}>
                                        {initials(pin.name)}
                                    </UIText>
                                )}
                            </YStack>
                        </Marker>
                    ))}
                </MapView>
            ) : (
                <YStack position='absolute' top={0} left={0} right={0} bottom={0} backgroundColor='$surface' />
            )}

            {/* Leaflet (web) stacks its panes up to z-index 1000; keep the controls above the map. */}
            <YStack position='absolute' top={insets.top + 10} left={space.gutter} right={space.gutter} gap={10} zIndex={1100}>
                <XStack justifyContent='space-between' alignItems='flex-start' gap={8}>
                    <YStack flex={1} gap={8}>
                        <XStack alignSelf='flex-start' height={44} paddingHorizontal={14} borderRadius={radius.pill} backgroundColor='$background' alignItems='center' style={{ shadowColor: '#101828', shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 }}>
                            <UIText variant='bodyStrong' numberOfLines={1}>
                                {mode === 'trucks' ? t('StoreMap.trucksTitle', { store: ownerInfo?.name ?? '' }) : t('StoreMap.locationsTitle', { store: ownerInfo?.name ?? '' })}
                            </UIText>
                        </XStack>
                        {truckPins.length > 0 && (
                            <YStack alignSelf='flex-start' borderRadius={radius.pill} backgroundColor='$background' padding={2}>
                                <SegmentedControl
                                    accessibilityLabel={t('StoreMap.show')}
                                    value={mode}
                                    onChange={(value: any) => setMode(value)}
                                    options={[
                                        { value: 'locations', label: t('StoreMap.locations') },
                                        { value: 'trucks', label: t('StoreMap.trucks', { count: truckPins.filter((pin) => pin.statusTone === 'success').length }) },
                                    ]}
                                />
                            </YStack>
                        )}
                    </YStack>
                    <IconButton icon={faLocationArrow} variant='floating' accessibilityLabel={t('Network.useMyLocation')} onPress={locateMe} />
                </XStack>
                {!customer && (
                    <XStack alignItems='center' gap={10} padding={12} borderRadius={radius.card} backgroundColor='$background' style={{ shadowColor: '#101828', shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 }}>
                        <UIText variant='caption' flex={1}>
                            {t('StoreMap.locationOff')}
                        </UIText>
                        <Button size='sm' icon={faLocationDot} onPress={() => handleNavigateNewLocation(navigation, { makeDefault: true })}>
                            {t('Network.map.setAddress')}
                        </Button>
                    </XStack>
                )}
            </YStack>

            <YStack position='absolute' left={0} right={0} bottom={12} zIndex={1100}>
                {loading ? (
                    <XStack paddingHorizontal={space.gutter}>
                        <Skeleton width={CARD_WIDTH} height={150} radius={radius.card} />
                    </XStack>
                ) : mode === 'locations' && storeLocationsError && locationPins.length === 0 ? (
                    <YStack marginHorizontal={space.gutter} borderRadius={radius.card} backgroundColor='$background'>
                        <ErrorState description={t('StoreMap.error')} onRetry={() => reloadStoreLocations()} />
                    </YStack>
                ) : sortedPins.length === 0 ? (
                    <YStack marginHorizontal={space.gutter} borderRadius={radius.card} backgroundColor='$background'>
                        <EmptyState icon={mode === 'trucks' ? faTruck : faStore} title={mode === 'trucks' ? t('StoreMap.noTrucks') : t('StoreMap.noLocations')} />
                    </YStack>
                ) : (
                    <FlatList
                        showsVerticalScrollIndicator={false}
                        ref={listRef}
                        horizontal
                        data={sortedPins}
                        keyExtractor={(item) => item.key}
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={CARD_WIDTH + CARD_GAP}
                        decelerationRate='fast'
                        contentContainerStyle={{ paddingHorizontal: Math.max(space.gutter, (width - CARD_WIDTH) / 2), gap: CARD_GAP }}
                        getItemLayout={(_item, index) => ({ length: CARD_WIDTH + CARD_GAP, offset: (CARD_WIDTH + CARD_GAP) * index, index })}
                        onMomentumScrollEnd={(event) => {
                            const index = Math.round(event.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
                            if (index !== selected) focus(Math.max(0, Math.min(sortedPins.length - 1, index)), { scroll: false });
                        }}
                        renderItem={({ item, index }) => (
                            <Pressable onPress={() => focus(index)} accessibilityRole='button' accessibilityLabel={[item.name, item.line, item.status, item.distance].filter(Boolean).join(', ')}>
                                <YStack
                                    width={CARD_WIDTH}
                                    padding={14}
                                    gap={8}
                                    borderRadius={radius.card}
                                    backgroundColor='$background'
                                    borderWidth={2}
                                    borderColor={index === selected ? '$primary' : 'transparent'}
                                    style={{ shadowColor: '#101828', shadowOpacity: 0.16, shadowRadius: 14, elevation: 5 }}
                                >
                                    <XStack gap={10} alignItems='flex-start'>
                                        <YStack flex={1} gap={2}>
                                            <UIText variant='bodyStrong' numberOfLines={1}>
                                                {item.name}
                                            </UIText>
                                            {!!item.line && (
                                                <UIText variant='caption' tone='secondary' numberOfLines={1}>
                                                    {item.line}
                                                </UIText>
                                            )}
                                        </YStack>
                                        {!!item.distance && (
                                            <UIText variant='captionStrong' tone='secondary'>
                                                {item.distance}
                                            </UIText>
                                        )}
                                    </XStack>
                                    {!!item.status && (
                                        <UIText variant='captionStrong' tone={item.statusTone}>
                                            {item.status}
                                        </UIText>
                                    )}
                                    <XStack gap={8}>
                                        {(item.kind === 'location' || hasTruckTab) && (
                                            <YStack flex={1}>
                                                <Button size='sm' fullWidth onPress={() => primary(item)}>
                                                    {item.kind === 'location' ? t('StoreMap.orderHere') : t('StoreMap.seeMenu')}
                                                </Button>
                                            </YStack>
                                        )}
                                        <IconButton icon={faDiamondTurnRight} size={40} accessibilityLabel={t('StoreMap.directionsTo', { name: item.name })} onPress={() => directions(item)} />
                                        {!!item.phone && <IconButton icon={faPhone} size={40} accessibilityLabel={t('StoreMap.call', { name: item.name })} onPress={() => Linking.openURL(`tel:${item.phone}`)} />}
                                    </XStack>
                                </YStack>
                            </Pressable>
                        )}
                    />
                )}
            </YStack>
            <View />
        </YStack>
    );
};

export default StoreMapScreen;
