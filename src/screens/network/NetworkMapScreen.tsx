import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { handleNavigateNewLocation } from '../../utils';
import { faList, faLocationArrow, faLocationDot, faStore } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useCustomerCoordinates from '../../hooks/use-customer-coordinates';
import { getMappableNetworkLocations, getNetworkLocationCoordinates } from '../../network/network-runtime';
import { distanceMeters, initialRegion, isValidCoordinate, type LatLng } from '../../network/map';
import { rememberStores } from '../../network/store-names';
import {
    Button,
    EmptyState,
    ErrorState,
    IconButton,
    Skeleton,
    StoreCard,
    UIText,
    formatDistance,
    initials,
    radius,
    space,
    storeSummary,
    tintFor,
    usesTwelveHourClock,
    type StoreSummary,
} from '../../ui';

const CARD_WIDTH = 300;
const CARD_GAP = 12;

type MapStore = { key: string; coordinate: LatLng; summary: StoreSummary };

/**
 * Every store location on a map, centred on the customer. Tapping a marker selects its
 * card in the carousel and swiping the carousel moves the map, so the two stay in sync.
 */

/** How far in to zoom on one store (about 2 km across). */
const STORE_DELTA = 0.02;
const NetworkMapScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { width } = useWindowDimensions();
    const { t, locale } = useLanguage();
    const { network } = useStorefrontRuntime();
    const [stores, setStores] = useState<MapStore[]>([]);
    const [selected, setSelected] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [retry, setRetry] = useState(0);
    const mapRef = useRef<any>(null);
    const listRef = useRef<FlatList>(null);
    const hour12 = usesTwelveHourClock(locale);

    const { point: customer } = useCustomerCoordinates();

    useEffect(() => {
        if (!network) return;
        let active = true;
        setLoading(true);
        setError(null);
        network
            .getStoreLocations({ with_store: true, limit: 100 })
            .then((result: any) => {
                if (!active) return;
                const mapped = getMappableNetworkLocations(Array.from(result || []))
                    .map((location: any): MapStore | null => {
                        const storeData = location.getAttribute?.('store_data') ?? location.getAttribute?.('store');
                        const coordinate = getNetworkLocationCoordinates(location);
                        if (!storeData || !isValidCoordinate(coordinate)) return null;
                        // The location's own hours decide whether this branch is open.
                        const summary = storeSummary({ ...storeData, locations: [{ hours: location.getAttribute?.('hours') ?? [] }] }, { t, hour12 });
                        const meters = customer ? distanceMeters(customer, coordinate) : null;
                        return { key: location.id, coordinate, summary: { ...summary, distance: formatDistance(meters) ?? summary.distance } };
                    })
                    .filter((item: MapStore | null): item is MapStore => item !== null);
                if (customer) mapped.sort((a, b) => distanceMeters(customer, a.coordinate) - distanceMeters(customer, b.coordinate));
                rememberStores(mapped.map((item) => item.summary));
                setStores(mapped);
                setSelected(0);
            })
            .catch((loadError: any) => active && setError(loadError))
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, [customer, hour12, network, retry, t]);

    const region = useMemo(
        () =>
            initialRegion(
                customer,
                stores.map((store) => store.coordinate)
            ),
        [customer, stores]
    );

    // `initialRegion` only applies when the map mounts, which can be before stores load.
    // Once they arrive, zoom in on the first store (the selected card, nearest first), as
    // tapping its card does. Framing the customer too can span a continent when they are
    // far from every store.
    const framed = useRef(false);
    useEffect(() => {
        if (framed.current || stores.length === 0) return;
        framed.current = true;
        const first = stores[0].coordinate;
        const timer = setTimeout(() => mapRef.current?.animateToRegion?.({ ...first, latitudeDelta: STORE_DELTA, longitudeDelta: STORE_DELTA }, 400), 250);
        return () => clearTimeout(timer);
    }, [stores]);

    const focus = useCallback(
        (index: number, { scroll = true } = {}) => {
            const store = stores[index];
            if (!store) return;
            setSelected(index);
            if (scroll) listRef.current?.scrollToIndex?.({ index, animated: true, viewPosition: 0.5 });
            mapRef.current?.animateToRegion?.({ ...store.coordinate, latitudeDelta: STORE_DELTA, longitudeDelta: STORE_DELTA }, 350);
        },
        [stores]
    );

    const locateMe = () => {
        if (customer) {
            mapRef.current?.animateToRegion?.({ ...customer, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 350);
        } else {
            navigation.navigate('LocationPermission');
        }
    };

    const markerHtml = (store: StoreSummary, active: boolean) => {
        const size = active ? 48 : 38;
        const border = active ? theme.primaryForeground.val : '#ffffff';
        const background = store.muted ? '#6b7280' : tintFor(store.name);
        const content = store.logoUrl
            ? `<img src="${store.logoUrl}" alt="" style="width:100%;height:100%;object-fit:cover"/>`
            : `<span style="font:800 ${Math.round(size * 0.32)}px system-ui,sans-serif;color:#1b2230">${initials(store.name)}</span>`;
        return `<div style="width:${size}px;height:${size}px;border-radius:50%;border:3px solid ${border};background:${background};display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.25)">${content}</div>`;
    };

    return (
        <YStack flex={1} backgroundColor='$background'>
            {region ? (
                <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={region} showsUserLocation={Platform.OS !== 'web'} accessibilityLabel={t('Network.map.label')}>
                    {stores.map((store, index) => (
                        <Marker
                            key={store.key}
                            coordinate={store.coordinate}
                            onPress={() => focus(index)}
                            accessibilityLabel={[store.summary.name, store.summary.distance, store.summary.statusText].filter(Boolean).join(', ')}
                            zIndex={index === selected ? 2 : 1}
                            // Leaflet (web) draws markers from HTML; native maps render the children.
                            {...({ webIconHtml: markerHtml(store.summary, index === selected), webIconSize: index === selected ? 48 : 38 } as object)}
                        >
                            <StoreMarker store={store.summary} active={index === selected} />
                        </Marker>
                    ))}
                </MapView>
            ) : (
                <YStack position='absolute' top={0} left={0} right={0} bottom={0} backgroundColor='$surface' />
            )}

            {/* Leaflet (web) stacks its panes up to z-index 1000; keep the controls above the map. */}
            <XStack position='absolute' top={insets.top + 10} left={space.gutter} right={space.gutter} justifyContent='space-between' alignItems='flex-start' gap={8} zIndex={1100}>
                {!customer ? (
                    <XStack
                        flex={1}
                        alignItems='center'
                        gap={10}
                        padding={12}
                        borderRadius={radius.card}
                        backgroundColor='$background'
                        style={{ shadowColor: '#101828', shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 }}
                    >
                        <UIText variant='caption' flex={1}>
                            {t('Network.map.setLocation')}
                        </UIText>
                        <Button size='sm' icon={faLocationDot} onPress={() => handleNavigateNewLocation(navigation, { makeDefault: true })}>
                            {t('Network.map.setAddress')}
                        </Button>
                    </XStack>
                ) : (
                    <View />
                )}
                <YStack gap={8}>
                    <IconButton icon={faLocationArrow} variant='floating' accessibilityLabel={t('Network.useMyLocation')} onPress={locateMe} />
                    <IconButton icon={faList} variant='floating' accessibilityLabel={t('Network.map.listView')} onPress={() => navigation.navigate('NetworkCategory', { sort: 'nearest' })} />
                </YStack>
            </XStack>

            <YStack position='absolute' left={0} right={0} bottom={12} zIndex={1100}>
                {loading ? (
                    <XStack paddingHorizontal={space.gutter} gap={CARD_GAP}>
                        <Skeleton width={CARD_WIDTH} height={104} radius={radius.card} />
                    </XStack>
                ) : error ? (
                    <YStack marginHorizontal={space.gutter} borderRadius={radius.card} backgroundColor='$background'>
                        <ErrorState description={t('Network.mapError')} onRetry={() => setRetry((value) => value + 1)} />
                    </YStack>
                ) : stores.length === 0 ? (
                    <YStack marginHorizontal={space.gutter} borderRadius={radius.card} backgroundColor='$background'>
                        <EmptyState icon={faStore} title={t('Network.noMapLocations')} />
                    </YStack>
                ) : (
                    <FlatList
                        showsVerticalScrollIndicator={false}
                        ref={listRef}
                        horizontal
                        data={stores}
                        keyExtractor={(item) => item.key}
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={CARD_WIDTH + CARD_GAP}
                        decelerationRate='fast'
                        contentContainerStyle={{ paddingHorizontal: Math.max(space.gutter, (width - CARD_WIDTH) / 2), gap: CARD_GAP }}
                        getItemLayout={(_item, index) => ({ length: CARD_WIDTH + CARD_GAP, offset: (CARD_WIDTH + CARD_GAP) * index, index })}
                        onMomentumScrollEnd={(event) => {
                            const index = Math.round(event.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
                            if (index !== selected) focus(Math.max(0, Math.min(stores.length - 1, index)), { scroll: false });
                        }}
                        renderItem={({ item, index }) => (
                            <StoreCard
                                store={item.summary}
                                variant='map'
                                width={CARD_WIDTH}
                                selected={index === selected}
                                onPress={() => (index === selected ? navigation.navigate('NetworkStore', { storeId: item.summary.id }) : focus(index))}
                            />
                        )}
                    />
                )}
            </YStack>
        </YStack>
    );
};

/** A store's map marker on iOS and Android: its logo or monogram, ringed when selected. */
function StoreMarker({ store, active }: { store: StoreSummary; active: boolean }) {
    const size = active ? 48 : 38;
    return (
        <YStack
            width={size}
            height={size}
            borderRadius={size / 2}
            borderWidth={3}
            borderColor={active ? '$primaryForeground' : '#ffffff'}
            alignItems='center'
            justifyContent='center'
            overflow='hidden'
            style={{ backgroundColor: store.muted ? '#6b7280' : tintFor(store.name) }}
        >
            <UIText variant='captionStrong' style={{ color: '#1b2230', fontSize: Math.round(size * 0.3) }}>
                {initials(store.name)}
            </UIText>
        </YStack>
    );
}

export default NetworkMapScreen;
