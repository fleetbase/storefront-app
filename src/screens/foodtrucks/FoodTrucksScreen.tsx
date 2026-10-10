import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCartShopping, faChevronDown, faChevronRight, faHouse, faLocationDot, faMagnifyingGlass, faMap, faSliders, faTableCellsLarge, faTruck } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useStorefront from '../../hooks/use-storefront';
import useStorage from '../../hooks/use-storage';
import useCartSummary from '../../hooks/use-cart-summary';
import useCurrentLocation from '../../hooks/use-current-location';
import useSavedLocations from '../../hooks/use-saved-locations';
import useFoodTrucks, { type StorePin, type TruckPin } from '../../hooks/use-food-trucks';
import { truckCategories } from '../../commerce/food-trucks';
import { fetchOffers, type Offer } from '../../commerce/offers';
import { initialRegion } from '../../network/map';
import { handleNavigateNewLocation } from '../../utils';
import { Button, ErrorState, LocationSheet, MediaImage, Skeleton, UIText, elevation, radius, space } from '../../ui';

type Mode = 'map' | 'list';
type Layer = 'all' | 'trucks' | 'stores';

const MODE_KEY = 'food-trucks:mode';

/**
 * The Trucks tab. Map first: trucks and stores on the map with the customer's zone, a
 * category slider, the nearest truck and store, and the cart. A toggle in the same
 * top-right slot switches to a list home (greeting, live-trucks card, categories, the
 * current offer); the last mode is remembered. Search opens from the header of both.
 * In a Network the stores are its member stores and the trucks theirs; a single store
 * shows its own locations and trucks.
 */
const FoodTrucksScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t } = useLanguage();
    const { customer: account } = useAuth() as any;
    const { mode: edition } = useStorefrontRuntime();
    const { storefront } = useStorefront();
    const cart = useCartSummary();
    const { currentLocation, updateCurrentLocation } = useCurrentLocation();
    const { savedLocations } = useSavedLocations();
    const { trucks, stores, customer, zone, loading, error, reload } = useFoodTrucks();
    const [mode, setMode] = useStorage<Mode>(MODE_KEY, 'map');
    const [layer, setLayer] = useState<Layer>('all');
    const [locationSheet, setLocationSheet] = useState(false);
    const [offer, setOffer] = useState<Offer | null>(null);
    const mapRef = useRef<any>(null);

    useEffect(() => {
        const adapter = storefront?.getAdapter?.();
        if (!adapter) return;
        fetchOffers((path, query) => adapter.get(path, query), { includeScheduled: false })
            .then((offers) => setOffer(offers.find((item) => item.availability === 'live') ?? null))
            .catch(() => {});
    }, [storefront]);

    const inZone = useMemo(() => (trucks ?? []).filter((truck) => truck.inZone), [trucks]);
    const liveInZone = inZone.filter((truck) => truck.live);
    const nearbyLive = (trucks ?? []).filter((truck) => truck.live && !truck.inZone);
    const outOfZone = !!customer && !!trucks && trucks.length > 0 && !zone;
    const categories = useMemo(() => truckCategories(liveInZone.length ? liveInZone : (trucks ?? []).filter((truck) => truck.live)), [liveInZone, trucks]);
    const nearestTruck = liveInZone[0] ?? nearbyLive[0] ?? null;
    const nearestStore = stores[0] ?? null;
    const placeName = currentLocation?.getAttribute?.('name') || currentLocation?.getAttribute?.('street1') || null;
    const zones = useMemo(() => {
        const seen = new Map<string, TruckPin>();
        (trucks ?? []).forEach((truck) => truck.zoneId && truck.zoneBorder.length && !seen.has(truck.zoneId) && seen.set(truck.zoneId, truck));
        return [...seen.values()];
    }, [trucks]);
    const region = useMemo(() => initialRegion(customer, [...(trucks ?? []).map((truck) => truck.coordinate).filter(Boolean), ...stores.map((store) => store.coordinate)] as any), [customer, stores, trucks]);

    const openTruck = (truck: TruckPin, categoryId?: string | null) => navigation.navigate('TruckMenu', { foodTruckId: truck.id, truck: truck.raw, categoryId: categoryId ?? null });
    const openStore = (store: StorePin) => {
        if (edition === 'network') navigation.navigate('NetworkStore', { storeId: store.storeId });
        else navigation.navigate('StoreHomeTab', { screen: 'StoreHome' });
    };
    const openCategory = (truckId: string, categoryId: string | null) => {
        const truck = (trucks ?? []).find((item) => item.id === truckId);
        if (truck) openTruck(truck, categoryId);
    };
    const openCart = () => navigation.navigate(edition === 'network' ? 'NetworkCartTab' : 'StoreCartTab');

    const statusLine = !trucks
        ? null
        : outOfZone
          ? t('FoodTrucks.outsideZones')
          : zone
            ? liveInZone.length
                ? t('FoodTrucks.inZone', { zone: zone.name ?? '' })
                : t('FoodTrucks.noneInZone', { zone: zone.name ?? '' })
            : t('FoodTrucks.zoneUnknown');
    const statusMeta = t('FoodTrucks.counts', { trucks: liveInZone.length || nearbyLive.length, stores: stores.length });

    const toggle = (
        <XStack padding={3} borderRadius={radius.pill} backgroundColor='$background' accessibilityRole='radiogroup' accessibilityLabel={t('FoodTrucks.showAs')} style={mode === 'map' ? elevation.floating : undefined}>
            {(['list', 'map'] as Mode[]).map((value) => {
                const selected = mode === value;
                return (
                    <Pressable
                        key={value}
                        onPress={() => setMode(value)}
                        accessibilityRole='radio'
                        accessibilityState={{ selected }}
                        accessibilityLabel={value === 'map' ? t('FoodTrucks.map') : t('FoodTrucks.list')}
                        hitSlop={4}
                        style={{ width: 40, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? theme.primary.val : 'transparent' }}
                    >
                        <FontAwesomeIcon icon={value === 'map' ? faMap : faTableCellsLarge} size={14} color={selected ? theme.primaryText.val : theme.textSecondary.val} />
                    </Pressable>
                );
            })}
        </XStack>
    );

    const searchBar = (
        <Pressable
            onPress={() => navigation.navigate('FoodTruckSearch')}
            accessibilityRole='search'
            accessibilityLabel={t('FoodTrucks.searchPlaceholder')}
            style={{ height: 48, paddingLeft: 14, paddingRight: 6, borderRadius: radius.button, backgroundColor: mode === 'map' ? theme.background.val : theme.surface.val, flexDirection: 'row', alignItems: 'center', gap: 10, ...(mode === 'map' ? elevation.floating : {}) }}
        >
            <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color={theme.textSecondary.val} />
            <UIText tone='placeholder' flex={1}>
                {t('FoodTrucks.searchPlaceholder')}
            </UIText>
            <YStack width={38} height={38} alignItems='center' justifyContent='center' borderLeftWidth={1} borderColor='$borderColor'>
                <FontAwesomeIcon icon={faSliders} size={14} color={theme.primaryForeground.val} />
            </YStack>
        </Pressable>
    );

    const locationChip = (
        <Pressable
            onPress={() => setLocationSheet(true)}
            accessibilityRole='button'
            accessibilityLabel={placeName ? t('Network.changeLocation', { place: placeName }) : t('Network.setLocation')}
            style={{ maxWidth: '70%', height: 40, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: theme.background.val, flexDirection: 'row', alignItems: 'center', gap: 6, ...elevation.floating }}
        >
            <FontAwesomeIcon icon={faLocationDot} size={14} color={theme.primaryForeground.val} />
            <UIText variant='captionStrong' numberOfLines={1} style={{ flexShrink: 1 }}>
                {[placeName || t('Network.setLocation'), zone?.name].filter(Boolean).join(' · ')}
            </UIText>
            <FontAwesomeIcon icon={faChevronDown} size={11} color={theme.textPrimary.val} />
        </Pressable>
    );

    const cartBar =
        cart.count > 0 ? (
            <Pressable onPress={openCart} accessibilityRole='button' style={{ height: 52, borderRadius: radius.button, backgroundColor: theme.primary.val, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}>
                <FontAwesomeIcon icon={faCartShopping} size={16} color={theme.primaryText.val} />
                <UIText variant='bodyStrong' tone='onPrimary' flex={1}>
                    {t('FoodTrucks.cart', { count: cart.count })}
                </UIText>
                <UIText variant='bodyStrong' tone='onPrimary'>
                    {cart.total}
                </UIText>
            </Pressable>
        ) : null;

    const placeActions = (
        <XStack gap={8}>
            <YStack flex={1}>
                <Button fullWidth onPress={() => handleNavigateNewLocation(navigation, { makeDefault: true })}>
                    {customer ? t('FoodTrucks.changeAddress') : t('FoodTrucks.enterAddress')}
                </Button>
            </YStack>
            {outOfZone && (
                <YStack flex={1}>
                    <Button variant='outline' fullWidth onPress={() => navigation.navigate(edition === 'network' ? 'NetworkHomeTab' : 'StoreHomeTab')}>
                        {t('FoodTrucks.orderFromStore')}
                    </Button>
                </YStack>
            )}
        </XStack>
    );

    const categoryTile = (category: { key: string; name: string; iconUrl: string | null; truckId: string; id: string | null }, size: number) => (
        <Pressable key={category.key} onPress={() => openCategory(category.truckId, category.id)} accessibilityRole='button' style={{ width: size, alignItems: 'center', gap: 6 }}>
            <MediaImage uri={category.iconUrl} seed={category.name} width={size} height={size - 10} radius={radius.tile} />
            <UIText variant='captionStrong' numberOfLines={1} style={{ fontSize: 12 }}>
                {category.name}
            </UIText>
        </Pressable>
    );

    const miniCard = (kind: 'truck' | 'store', name: string, meta: string | null, onPress: () => void) => (
        <Pressable onPress={onPress} accessibilityRole='button' style={{ flex: 1, minWidth: 0, padding: 10, borderRadius: radius.card, backgroundColor: theme.surface.val, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <YStack width={34} height={34} borderRadius={10} alignItems='center' justifyContent='center' backgroundColor={kind === 'truck' ? '$primary' : '$warning'}>
                <FontAwesomeIcon icon={kind === 'truck' ? faTruck : faHouse} size={15} color={kind === 'truck' ? theme.primaryText.val : '#ffffff'} />
            </YStack>
            <YStack flex={1} minWidth={0}>
                <UIText variant='captionStrong' numberOfLines={1}>
                    {name}
                </UIText>
                {!!meta && (
                    <UIText variant='caption' tone='success' numberOfLines={1}>
                        {meta}
                    </UIText>
                )}
            </YStack>
        </Pressable>
    );

    const sheetBody = loading ? (
        <YStack gap={12}>
            <Skeleton height={18} width='60%' />
            <XStack gap={10}>
                {[0, 1, 2, 3].map((index) => (
                    <Skeleton key={index} width={74} height={74} radius={radius.tile} />
                ))}
            </XStack>
            <XStack gap={10}>
                <Skeleton height={56} radius={radius.card} style={{ flex: 1 }} />
                <Skeleton height={56} radius={radius.card} style={{ flex: 1 }} />
            </XStack>
        </YStack>
    ) : error && !trucks ? (
        <ErrorState title={t('FoodTrucks.errorTitle')} onRetry={reload} />
    ) : !customer || outOfZone ? (
        <YStack gap={8}>
            <UIText variant='subheading'>{outOfZone ? t('FoodTrucks.outsideTitle') : t('FoodTrucks.whereTitle')}</UIText>
            <UIText tone='secondary'>{outOfZone ? t('FoodTrucks.outsideBody', { zones: zones.map((item) => item.zoneName).filter(Boolean).join(', ') }) : t('FoodTrucks.whereBody')}</UIText>
            {placeActions}
        </YStack>
    ) : (
        <YStack gap={12}>
            <XStack justifyContent='space-between' alignItems='center' gap={8}>
                <XStack alignItems='center' gap={8} flex={1}>
                    <YStack width={8} height={8} borderRadius={4} backgroundColor={liveInZone.length ? '$success' : '$warning'} />
                    <UIText variant='bodyStrong' numberOfLines={1} flex={1}>
                        {statusLine}
                    </UIText>
                </XStack>
                <UIText variant='caption' tone='secondary'>
                    {statusMeta}
                </UIText>
            </XStack>
            {categories.length > 0 && (
                <>
                    <XStack justifyContent='space-between' alignItems='center'>
                        <UIText variant='subheading'>{t('FoodTrucks.categories')}</UIText>
                        {nearestTruck && (
                            <Pressable onPress={() => openTruck(nearestTruck)} accessibilityRole='link' style={{ minHeight: 32, justifyContent: 'center' }}>
                                <UIText variant='captionStrong' tone='brand'>
                                    {t('FoodTrucks.all')}
                                </UIText>
                            </Pressable>
                        )}
                    </XStack>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                        {categories.map((category) => categoryTile(category, 74))}
                    </ScrollView>
                </>
            )}
            <XStack gap={10}>
                {nearestTruck && miniCard('truck', nearestTruck.name, nearestTruck.distance ?? t('FoodTrucks.live'), () => openTruck(nearestTruck))}
                {nearestStore && layer !== 'trucks' && miniCard('store', nearestStore.name, nearestStore.statusText, () => openStore(nearestStore))}
            </XStack>
            {cartBar}
        </YStack>
    );

    const showTrucks = layer !== 'stores';
    const showStores = layer !== 'trucks';

    const mapMode = (
        <YStack flex={1}>
            {region ? (
                <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={region} showsUserLocation={Platform.OS !== 'web'} accessibilityLabel={t('FoodTrucks.mapLabel')}>
                    {zones.map((item) =>
                        item.zoneBorder.map((ring, index) => (
                            <Polygon
                                key={`${item.zoneId}-${index}`}
                                coordinates={ring}
                                strokeColor={theme.primary.val}
                                strokeWidth={2}
                                lineDashPattern={[8, 6]}
                                fillColor={item.zoneId === zone?.id ? `${theme.primary.val}22` : 'transparent'}
                            />
                        ))
                    )}
                    {showTrucks &&
                        (trucks ?? [])
                            .filter((truck) => truck.coordinate)
                            .map((truck) => (
                                <Marker key={`truck-${truck.id}`} coordinate={truck.coordinate as any} onPress={() => openTruck(truck)} accessibilityLabel={[truck.name, truck.live ? t('FoodTrucks.live') : t('FoodTrucks.offline'), truck.distance].filter(Boolean).join(', ')}>
                                    <MapPin kind='truck' active={truck.live} label={truck.name} meta={truck.live ? truck.distance : t('FoodTrucks.offline')} />
                                </Marker>
                            ))}
                    {showStores &&
                        stores.map((store) => (
                            <Marker key={`store-${store.key}`} coordinate={store.coordinate} onPress={() => openStore(store)} accessibilityLabel={[store.name, store.statusText].filter(Boolean).join(', ')}>
                                <MapPin kind='store' active={store.open} label={store.name} meta={store.statusText} />
                            </Marker>
                        ))}
                </MapView>
            ) : (
                <YStack position='absolute' top={0} left={0} right={0} bottom={0} backgroundColor='$surface' />
            )}

            <YStack position='absolute' top={insets.top + 8} left={space.gutter} right={space.gutter} gap={10} zIndex={1100}>
                <XStack justifyContent='space-between' alignItems='center' gap={8}>
                    {locationChip}
                    {toggle}
                </XStack>
                {searchBar}
                <XStack gap={8} accessibilityRole='radiogroup' accessibilityLabel={t('FoodTrucks.showOnMap')}>
                    {(['all', 'trucks', 'stores'] as Layer[]).map((value) => {
                        const selected = layer === value;
                        return (
                            <Pressable
                                key={value}
                                onPress={() => setLayer(value)}
                                accessibilityRole='radio'
                                accessibilityState={{ selected }}
                                style={{ height: 34, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: selected ? theme.textPrimary.val : theme.background.val, ...elevation.floating }}
                            >
                                <UIText variant='captionStrong' style={{ color: selected ? theme.background.val : theme.textPrimary.val }}>
                                    {t(`FoodTrucks.layer.${value}`)}
                                </UIText>
                            </Pressable>
                        );
                    })}
                </XStack>
            </YStack>

            <YStack position='absolute' left={0} right={0} bottom={0} zIndex={1100} paddingHorizontal={space.gutter} paddingTop={10} paddingBottom={14} gap={12} borderTopLeftRadius={radius.sheet} borderTopRightRadius={radius.sheet} backgroundColor='$background' style={elevation.floating}>
                <YStack alignSelf='center' width={40} height={5} borderRadius={3} backgroundColor='$borderColorWithShadow' />
                {sheetBody}
            </YStack>
        </YStack>
    );

    const greetingName = String(account?.getAttribute?.('name') ?? '').split(' ')[0];
    const listMode = (
        <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: space.gutter, paddingBottom: 32, gap: 14 }}>
            <XStack justifyContent='space-between' alignItems='flex-start' gap={12}>
                <YStack flex={1} gap={2}>
                    <UIText variant='title' accessibilityRole='header'>
                        {greetingName ? t('FoodTrucks.greetingNamed', { name: greetingName }) : t('FoodTrucks.greeting')}
                    </UIText>
                    <Pressable onPress={() => setLocationSheet(true)} accessibilityRole='button' style={{ minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <UIText tone='secondary'>{t('FoodTrucks.deliverTo')}</UIText>
                        <UIText variant='bodyStrong' tone='brand' numberOfLines={1} style={{ flexShrink: 1 }}>
                            {[placeName || t('Network.setLocation'), zone?.name].filter(Boolean).join(' · ')}
                        </UIText>
                        <FontAwesomeIcon icon={faChevronDown} size={11} color={theme.primaryForeground.val} />
                    </Pressable>
                </YStack>
                {toggle}
            </XStack>
            {searchBar}
            {loading ? (
                <YStack gap={12}>
                    <Skeleton height={92} radius={radius.card} />
                    <Skeleton height={18} width='40%' />
                    <XStack flexWrap='wrap' gap={10}>
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
                            <Skeleton key={index} width='22%' height={72} radius={radius.tile} />
                        ))}
                    </XStack>
                </YStack>
            ) : error && !trucks ? (
                <ErrorState title={t('FoodTrucks.errorTitle')} onRetry={reload} />
            ) : (
                <>
                    <Pressable
                        onPress={() => setMode('map')}
                        accessibilityRole='button'
                        accessibilityLabel={liveInZone.length ? t('FoodTrucks.liveCardLabel', { count: liveInZone.length }) : t('FoodTrucks.liveCardNoneLabel')}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.card, borderWidth: 2, borderColor: liveInZone.length ? theme.primary.val : theme.borderColor.val, backgroundColor: liveInZone.length ? theme.primarySoft.val : theme.surface.val }}
                    >
                        <YStack width={56} height={56} borderRadius={radius.tile} backgroundColor='$surface2' alignItems='center' justifyContent='center'>
                            <FontAwesomeIcon icon={faTruck} size={22} color={liveInZone.length ? theme.primaryForeground.val : theme.textSecondary.val} />
                        </YStack>
                        <YStack flex={1} gap={3}>
                            <XStack alignItems='center' gap={6}>
                                <UIText variant='bodyStrong'>{t('FoodTrucks.title')}</UIText>
                                <YStack paddingHorizontal={8} paddingVertical={2} borderRadius={radius.pill} backgroundColor={liveInZone.length ? '$successSoft' : '$surface2'}>
                                    <UIText variant='captionStrong' tone={liveInZone.length ? 'success' : 'secondary'} style={{ fontSize: 11 }}>
                                        {liveInZone.length ? t('FoodTrucks.live') : t('FoodTrucks.noneLive')}
                                    </UIText>
                                </YStack>
                            </XStack>
                            <UIText variant='caption' tone='secondary'>
                                {outOfZone
                                    ? t('FoodTrucks.outsideZones')
                                    : liveInZone.length
                                      ? t('FoodTrucks.liveLine', { zone: zone?.name ?? '', count: liveInZone.length, distance: liveInZone[0]?.distance ?? '' })
                                      : t('FoodTrucks.noneLiveLine', { count: nearbyLive.length })}
                            </UIText>
                        </YStack>
                        <FontAwesomeIcon icon={faChevronRight} size={14} color={theme.primaryForeground.val} />
                    </Pressable>

                    {categories.length > 0 && (
                        <>
                            <XStack justifyContent='space-between' alignItems='center'>
                                <UIText variant='heading'>{t('FoodTrucks.categories')}</UIText>
                                {nearestTruck && (
                                    <Pressable onPress={() => openTruck(nearestTruck)} accessibilityRole='link' style={{ minHeight: 32, justifyContent: 'center' }}>
                                        <UIText variant='captionStrong' tone='brand'>
                                            {t('FoodTrucks.all')}
                                        </UIText>
                                    </Pressable>
                                )}
                            </XStack>
                            <XStack flexWrap='wrap' gap={10} justifyContent='space-between'>
                                {categories.slice(0, nearestTruck ? 7 : 8).map((category) => categoryTile(category, 78))}
                                {nearestTruck && (
                                    <Pressable onPress={() => openTruck(nearestTruck)} accessibilityRole='link' style={{ width: 78, alignItems: 'center', gap: 6 }}>
                                        <YStack width={78} height={68} borderRadius={radius.tile} backgroundColor='$primary' alignItems='center' justifyContent='center'>
                                            <FontAwesomeIcon icon={faTableCellsLarge} size={20} color={theme.primaryText.val} />
                                        </YStack>
                                        <UIText variant='captionStrong' tone='brand' style={{ fontSize: 12 }}>
                                            {t('FoodTrucks.allShort')}
                                        </UIText>
                                    </Pressable>
                                )}
                            </XStack>
                        </>
                    )}

                    {offer && (
                        <Pressable
                            onPress={() => navigation.navigate('Offer', { offerId: offer.id, offer })}
                            accessibilityRole='link'
                            style={{ flexDirection: 'row', gap: 12, padding: 16, borderRadius: radius.card, backgroundColor: theme.surface.val, overflow: 'hidden' }}
                        >
                            <YStack flex={1} gap={6}>
                                <YStack alignSelf='flex-start' paddingHorizontal={8} paddingVertical={2} borderRadius={radius.pill} backgroundColor='$errorSoft'>
                                    <UIText variant='captionStrong' tone='error' style={{ fontSize: 11 }}>
                                        {t('FoodTrucks.offer')}
                                    </UIText>
                                </YStack>
                                <UIText variant='subheading'>{offer.name}</UIText>
                                {!!offer.description && (
                                    <UIText variant='caption' tone='secondary' numberOfLines={2}>
                                        {offer.description}
                                    </UIText>
                                )}
                            </YStack>
                            <MediaImage uri={offer.imageUrl} seed={offer.name} width={96} height={96} radius={radius.tile} />
                        </Pressable>
                    )}
                    {cartBar}
                </>
            )}
        </ScrollView>
    );

    return (
        <YStack flex={1} backgroundColor='$background'>
            {mode === 'list' ? listMode : mapMode}
            <LocationSheet
                open={locationSheet}
                onClose={() => setLocationSheet(false)}
                savedLocations={savedLocations}
                current={currentLocation}
                onSelect={(place: any) => {
                    updateCurrentLocation(place);
                    setLocationSheet(false);
                }}
            />
        </YStack>
    );
};

/** A map marker: a truck or a store tile with its name and a short line under it. */
function MapPin({ kind, active, label, meta }: { kind: 'truck' | 'store'; active: boolean; label: string; meta: string | null }) {
    const theme = useTheme();
    const background = kind === 'store' ? theme.warning.val : active ? theme.primary.val : theme.surface2.val;
    const foreground = kind === 'store' ? '#ffffff' : active ? theme.primaryText.val : theme.textSecondary.val;
    return (
        <YStack alignItems='center' gap={3} opacity={active ? 1 : 0.75}>
            <YStack width={40} height={40} borderRadius={12} borderWidth={2} borderColor='$background' alignItems='center' justifyContent='center' style={{ backgroundColor: background, ...elevation.floating }}>
                <FontAwesomeIcon icon={kind === 'truck' ? faTruck : faHouse} size={17} color={foreground} />
            </YStack>
            <XStack paddingHorizontal={7} paddingVertical={2} borderRadius={radius.pill} backgroundColor='$background' gap={4} style={elevation.card}>
                <UIText variant='captionStrong' numberOfLines={1} style={{ fontSize: 11, maxWidth: 110 }}>
                    {label}
                </UIText>
                {!!meta && (
                    <UIText variant='captionStrong' tone={active ? 'success' : 'secondary'} numberOfLines={1} style={{ fontSize: 11, maxWidth: 70 }}>
                        · {meta}
                    </UIText>
                )}
            </XStack>
        </YStack>
    );
}

export default FoodTrucksScreen;
