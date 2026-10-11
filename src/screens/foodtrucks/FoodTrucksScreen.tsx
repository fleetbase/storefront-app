import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCartShopping, faChevronDown, faChevronRight, faCrosshairs, faLocationDot, faMagnifyingGlass, faMap, faTableCellsLarge, faTruck } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useStorefront from '../../hooks/use-storefront';
import useStorage from '../../hooks/use-storage';
import useCartSummary from '../../hooks/use-cart-summary';
import useCurrentLocation from '../../hooks/use-current-location';
import useSavedLocations from '../../hooks/use-saved-locations';
import useFoodTrucks, { nearbyPlaces, zoneBorderOf, type NearbyPlace, type StorePin, type TruckPin } from '../../hooks/use-food-trucks';
import PlaceIcon from './PlaceIcon';
import { truckCategories, type LatLng, type TruckCategory } from '../../commerce/food-trucks';
import { fetchOffers, type Offer } from '../../commerce/offers';
import { initialRegion } from '../../network/map';
import { handleNavigateNewLocation } from '../../utils';
import { OfferRow } from '../../components/offers/OfferCard';
import { Button, CartPill, ErrorState, LanguageButton, LocationSheet, MediaImage, Skeleton, UIText, elevation, radius, space } from '../../ui';

type Mode = 'map' | 'list';
type Layer = 'all' | 'trucks' | 'stores';

type Place = NearbyPlace;
type PlaceCategory = { key: string; id: string | null; name: string; iconUrl: string | null };

const MODE_KEY = 'food-trucks:mode';

/**
 * The categories of the selected truck (from its catalogs) or store (loaded once per store).
 */
function usePlaceCategories(place: Place | null): { categories: PlaceCategory[]; loading: boolean } {
    const { storefront } = useStorefront();
    const { mode } = useStorefrontRuntime();
    const cache = useRef(new Map<string, PlaceCategory[]>());
    const [storeCategories, setStoreCategories] = useState<{ key: string; items: PlaceCategory[] } | null>(null);
    const storeId = place?.kind === 'store' ? (place.store?.storeId ?? null) : null;

    useEffect(() => {
        if (!storeId || !storefront) return;
        const cached = cache.current.get(storeId);
        if (cached) {
            setStoreCategories({ key: storeId, items: cached });
            return;
        }
        let active = true;
        const request = mode === 'network' ? storefront.categories.query({ store: storeId }) : storefront.categories.findAll();
        Promise.resolve(request)
            .then((result: any) => {
                const items = (Array.from(result || []) as any[]).map((category) => {
                    const get = (key: string) => (typeof category?.getAttribute === 'function' ? category.getAttribute(key) : category?.[key]);
                    return { key: String(category.id), id: category.id ?? null, name: String(get('name') ?? ''), iconUrl: get('icon_url') ?? null };
                });
                cache.current.set(storeId, items);
                if (active) setStoreCategories({ key: storeId, items });
            })
            .catch(() => active && setStoreCategories({ key: storeId, items: [] }));
        return () => {
            active = false;
        };
    }, [mode, storeId, storefront]);

    return useMemo(() => {
        if (!place) return { categories: [], loading: false };
        if (place.kind === 'truck' && place.truck) {
            return { categories: truckCategories([place.truck]).map((category: TruckCategory) => ({ key: category.key, id: category.id, name: category.name, iconUrl: category.iconUrl })), loading: false };
        }
        if (storeCategories?.key === storeId) return { categories: storeCategories.items, loading: false };
        return { categories: [], loading: true };
    }, [place, storeCategories, storeId]);
}

/**
 * The Trucks home. Map first: the trucks and stores around the customer with their zone,
 * and below a "Near you" row of the trucks and stores that serve that zone. Picking one
 * shows its categories; tapping a category opens its products. A toggle in the same
 * top-right slot switches to a list layout of the same; the last mode is remembered.
 * Search opens from the header of both. In a Network the stores are its member stores
 * and the trucks theirs; a single store shows its own locations and trucks.
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
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [locationSheet, setLocationSheet] = useState(false);
    const [offers, setOffers] = useState<Offer[]>([]);
    const offer = offers[0] ?? null;
    const mapRef = useRef<any>(null);

    useEffect(() => {
        const adapter = storefront?.getAdapter?.();
        if (!adapter) return;
        fetchOffers((path, query) => adapter.get(path, query), { includeScheduled: false })
            .then((list) => setOffers(list.filter((item) => item.availability === 'live')))
            .catch(() => {});
    }, [storefront]);

    const liveInZone = useMemo(() => (trucks ?? []).filter((truck) => truck.inZone && truck.live), [trucks]);
    const nearbyLive = useMemo(() => (trucks ?? []).filter((truck) => truck.live && !truck.inZone), [trucks]);
    const outOfZone = !!customer && !!trucks && trucks.length > 0 && !zone;
    const placeName = currentLocation?.getAttribute?.('name') || currentLocation?.getAttribute?.('street1') || null;
    const zones = useMemo(() => {
        const seen = new Map<string, TruckPin>();
        (trucks ?? []).forEach((truck) => truck.zoneId && truck.zoneBorder.length && !seen.has(truck.zoneId) && seen.set(truck.zoneId, truck));
        return [...seen.values()];
    }, [trucks]);
    const zoneBorder = useMemo(() => zoneBorderOf(trucks, zone?.id), [trucks, zone?.id]);
    const region = useMemo(() => initialRegion(customer, [...(trucks ?? []).map((truck) => truck.coordinate).filter(Boolean), ...stores.map((store) => store.coordinate)] as any), [customer, stores, trucks]);

    // The trucks serving the customer's zone and the stores in it (see nearbyPlaces).
    const places = useMemo<Place[]>(
        () => nearbyPlaces(trucks, stores, zoneBorder, t('FoodTrucks.offline')).filter((item) => layer === 'all' || (layer === 'trucks' ? item.kind === 'truck' : item.kind === 'store')),
        [layer, stores, t, trucks, zoneBorder]
    );

    useEffect(() => {
        if (!places.length) return;
        if (!selectedKey || !places.some((item) => item.key === selectedKey)) setSelectedKey(places[0].key);
    }, [places, selectedKey]);

    const selected = places.find((item) => item.key === selectedKey) ?? null;
    const { categories, loading: categoriesLoading } = usePlaceCategories(selected);

    const openTruck = (truck: TruckPin, categoryId?: string | null) => navigation.navigate('TruckMenu', { foodTruckId: truck.id, truck: truck.raw, categoryId: categoryId ?? null });
    const openStore = (store: StorePin, categoryId?: string | null) => {
        if (edition === 'network') navigation.navigate('NetworkStore', { storeId: store.storeId, categoryId: categoryId ?? undefined });
        else navigation.navigate('StoreHome', { categoryId: categoryId ?? undefined });
    };
    const openPlace = (place: Place, categoryId?: string | null) => {
        if (place.truck) openTruck(place.truck, categoryId);
        else if (place.store) openStore(place.store, categoryId);
    };
    const openCart = () => navigation.navigate(edition === 'network' ? 'NetworkCartTab' : 'StoreCartTab');

    const focus = (coordinate: LatLng | null, delta = 0.02) => {
        if (!coordinate) return;
        mapRef.current?.animateToRegion?.({ ...coordinate, latitudeDelta: delta, longitudeDelta: delta }, 350);
    };
    const select = (place: Place) => {
        // A second tap on the selected place opens it.
        if (place.key === selectedKey) {
            openPlace(place);
            return;
        }
        setSelectedKey(place.key);
        if (mode === 'map') focus(place.coordinate);
    };
    const recenter = () => {
        if (customer) focus(customer, 0.03);
        else setLocationSheet(true);
    };

    // The map's bottom sheet: collapsed it shows the places and categories; pulled up by its
    // handle it also shows the current promotions.
    const [areaHeight, setAreaHeight] = useState(0);
    const [collapsedHeight, setCollapsedHeight] = useState(0);
    const [expanded, setExpanded] = useState(false);
    const sheetHeight = Math.max(areaHeight - insets.top - 72, collapsedHeight);
    const collapsedOffset = Math.max(sheetHeight - collapsedHeight, 0);
    // Starts off-screen until the collapsed height is measured.
    const sheetY = useRef(new Animated.Value(2000)).current;
    const sheetState = useRef({ collapsedOffset: 0, expanded: false, start: 0 });
    sheetState.current.collapsedOffset = collapsedOffset;
    sheetState.current.expanded = expanded;

    const snapSheet = (open: boolean) => {
        setExpanded(open);
        Animated.spring(sheetY, { toValue: open ? 0 : sheetState.current.collapsedOffset, useNativeDriver: true, bounciness: 2 }).start();
    };
    useEffect(() => {
        sheetY.setValue(expanded ? 0 : collapsedOffset);
        // Keep the collapsed position in step with its content's height.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collapsedOffset]);

    const sheetPan = useRef(
        PanResponder.create({
            // Vertical drags anywhere on the collapsed sheet move it; horizontal ones still scroll the rows.
            onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.5,
            onPanResponderTerminationRequest: () => false,
            onPanResponderGrant: () => {
                sheetState.current.start = sheetState.current.expanded ? 0 : sheetState.current.collapsedOffset;
            },
            onPanResponderMove: (_, gesture) => {
                sheetY.setValue(Math.min(Math.max(sheetState.current.start + gesture.dy, 0), sheetState.current.collapsedOffset));
            },
            onPanResponderRelease: (_, gesture) => {
                const open = gesture.vy < -0.4 || gesture.dy < -60 ? true : gesture.vy > 0.4 || gesture.dy > 60 ? false : sheetState.current.expanded;
                snapSheetRef.current(open);
            },
        })
    ).current;
    const snapSheetRef = useRef(snapSheet);
    snapSheetRef.current = snapSheet;

    const statusLine = !trucks
        ? null
        : outOfZone
          ? t('FoodTrucks.outsideZones')
          : zone
            ? liveInZone.length
                ? t('FoodTrucks.inZone', { zone: zone.name ?? '' })
                : t('FoodTrucks.noneInZone', { zone: zone.name ?? '' })
            : t('FoodTrucks.zoneUnknown');

    const toggle = (
        <XStack padding={3} borderRadius={radius.pill} backgroundColor='$background' accessibilityRole='radiogroup' accessibilityLabel={t('FoodTrucks.showAs')} style={mode === 'map' ? elevation.floating : undefined}>
            {(['list', 'map'] as Mode[]).map((value) => {
                const isSelected = mode === value;
                return (
                    <Pressable
                        key={value}
                        onPress={() => setMode(value)}
                        accessibilityRole='radio'
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={value === 'map' ? t('FoodTrucks.map') : t('FoodTrucks.list')}
                        hitSlop={4}
                        style={{ width: 40, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? theme.primary.val : 'transparent' }}
                    >
                        <FontAwesomeIcon icon={value === 'map' ? faMap : faTableCellsLarge} size={14} color={isSelected ? theme.primaryText.val : theme.textSecondary.val} />
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
            style={{ height: 48, paddingHorizontal: 14, borderRadius: radius.button, backgroundColor: mode === 'map' ? theme.background.val : theme.surface.val, flexDirection: 'row', alignItems: 'center', gap: 10, ...(mode === 'map' ? elevation.floating : {}) }}
        >
            <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color={theme.textSecondary.val} />
            <UIText tone='placeholder' flex={1} numberOfLines={1}>
                {t('FoodTrucks.searchPlaceholder')}
            </UIText>
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

    const placeActions = (
        <XStack gap={8}>
            <YStack flex={1}>
                <Button fullWidth onPress={() => handleNavigateNewLocation(navigation, { makeDefault: true })}>
                    {customer ? t('FoodTrucks.changeAddress') : t('FoodTrucks.enterAddress')}
                </Button>
            </YStack>
            {outOfZone && stores[0] && (
                <YStack flex={1}>
                    <Button variant='outline' fullWidth onPress={() => openStore(stores[0])}>
                        {t('FoodTrucks.orderFromStore')}
                    </Button>
                </YStack>
            )}
        </XStack>
    );

    // "Near you": the trucks and stores serving the customer's zone; one is selected.
    const placeRow = (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }} accessibilityRole='radiogroup' accessibilityLabel={t('FoodTrucks.nearYou')}>
            {places.map((place) => {
                const isSelected = place.key === selectedKey;
                const kindLabel = place.kind === 'truck' ? t('FoodTrucks.kindTruck') : t('FoodTrucks.kindStore');
                return (
                    <Pressable
                        key={place.key}
                        onPress={() => select(place)}
                        accessibilityRole='radio'
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={[place.name, kindLabel, place.meta].filter(Boolean).join(', ')}
                        accessibilityHint={isSelected ? t('FoodTrucks.openHint') : undefined}
                        style={{
                            width: 210,
                            padding: 10,
                            borderRadius: radius.card,
                            borderWidth: 2,
                            borderColor: isSelected ? theme.primary.val : theme.borderColor.val,
                            backgroundColor: isSelected ? theme.primarySoft.val : theme.surface.val,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            opacity: place.active ? 1 : 0.65,
                        }}
                    >
                        <PlaceIcon kind={place.kind} active={place.active} size={40} logoUrl={place.photoUrl} />
                        <YStack flex={1} minWidth={0}>
                            <UIText variant='captionStrong' numberOfLines={1}>
                                {place.name}
                            </UIText>
                            <UIText variant='caption' tone={place.active ? 'success' : 'secondary'} numberOfLines={1}>
                                {[kindLabel, place.meta].filter(Boolean).join(' · ')}
                            </UIText>
                        </YStack>
                        {isSelected && <FontAwesomeIcon icon={faChevronRight} size={12} color={theme.primaryForeground.val} />}
                    </Pressable>
                );
            })}
        </ScrollView>
    );

    const categoryTile = (category: PlaceCategory, size: number) => (
        <Pressable key={category.key} onPress={() => selected && openPlace(selected, category.id)} accessibilityRole='button' style={{ width: size, alignItems: 'center', gap: 6 }}>
            <MediaImage uri={category.iconUrl} seed={category.name} width={size} height={size - 10} radius={radius.tile} />
            <UIText variant='captionStrong' numberOfLines={1} style={{ fontSize: 12 }}>
                {category.name}
            </UIText>
        </Pressable>
    );

    const allTile = (size: number) =>
        selected ? (
            <Pressable key='all' onPress={() => openPlace(selected)} accessibilityRole='link' accessibilityLabel={t('FoodTrucks.viewAllOf', { name: selected.name })} style={{ width: size, alignItems: 'center', gap: 6 }}>
                <YStack width={size} height={size - 10} borderRadius={radius.tile} backgroundColor='$primary' alignItems='center' justifyContent='center'>
                    <FontAwesomeIcon icon={faTableCellsLarge} size={20} color={theme.primaryText.val} />
                </YStack>
                <UIText variant='captionStrong' tone='brand' style={{ fontSize: 12 }}>
                    {t('FoodTrucks.allShort')}
                </UIText>
            </Pressable>
        ) : null;

    const categoriesHeader = selected ? (
        <XStack justifyContent='space-between' alignItems='center' gap={8}>
            <UIText variant='subheading' numberOfLines={1} flex={1}>
                {t('FoodTrucks.categoriesOf', { name: selected.name })}
            </UIText>
            <Pressable onPress={() => openPlace(selected)} accessibilityRole='link' style={{ minHeight: 32, justifyContent: 'center' }}>
                <UIText variant='captionStrong' tone='brand'>
                    {t('FoodTrucks.all')}
                </UIText>
            </Pressable>
        </XStack>
    ) : null;

    const categorySkeletons = (count: number, size: number) =>
        Array.from({ length: count }).map((_, index) => <Skeleton key={index} width={size} height={size} radius={radius.tile} />);

    const statusRow = (
        <XStack alignItems='center' gap={8}>
            <YStack width={8} height={8} borderRadius={4} backgroundColor={liveInZone.length ? '$success' : '$warning'} />
            <UIText variant='bodyStrong' numberOfLines={1} flex={1}>
                {statusLine}
            </UIText>
        </XStack>
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

    const sheetBody = loading ? (
        <YStack gap={12}>
            <Skeleton height={18} width='60%' />
            <XStack gap={10}>
                <Skeleton width={210} height={64} radius={radius.card} />
                <Skeleton width={210} height={64} radius={radius.card} />
            </XStack>
            <XStack gap={10}>{categorySkeletons(4, 74)}</XStack>
        </YStack>
    ) : error && !trucks ? (
        <ErrorState title={t('FoodTrucks.errorTitle')} onRetry={reload} />
    ) : !customer || outOfZone || !places.length ? (
        <YStack gap={8}>
            <UIText variant='subheading'>{outOfZone || (customer && !places.length) ? t('FoodTrucks.outsideTitle') : t('FoodTrucks.whereTitle')}</UIText>
            <UIText tone='secondary'>{outOfZone || (customer && !places.length) ? t('FoodTrucks.outsideBody', { zones: zones.map((item) => item.zoneName).filter(Boolean).join(', ') }) : t('FoodTrucks.whereBody')}</UIText>
            {placeActions}
        </YStack>
    ) : (
        <YStack gap={12}>
            {statusRow}
            {placeRow}
            {categoriesHeader}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {categoriesLoading ? categorySkeletons(4, 74) : [...categories.map((category) => categoryTile(category, 74)), allTile(74)]}
            </ScrollView>
            {cartBar}
        </YStack>
    );

    const showTrucks = layer !== 'stores';
    const showStores = layer !== 'trucks';

    const mapMode = (
        <YStack flex={1} onLayout={(event) => setAreaHeight(event.nativeEvent.layout.height)}>
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
                            .map((truck) => {
                                const place = places.find((item) => item.truck?.id === truck.id);
                                return (
                                    <Marker
                                        key={`truck-${truck.id}`}
                                        coordinate={truck.coordinate as any}
                                        onPress={() => (place ? select(place) : openTruck(truck))}
                                        accessibilityLabel={[truck.name, truck.live ? t('FoodTrucks.live') : t('FoodTrucks.offline'), truck.distance].filter(Boolean).join(', ')}
                                    >
                                        <MapPin kind='truck' active={truck.live} selected={!!place && place.key === selectedKey} label={truck.name} meta={truck.live ? truck.distance : t('FoodTrucks.offline')} />
                                    </Marker>
                                );
                            })}
                    {showStores &&
                        stores.map((store) => {
                            const place = places.find((item) => item.store?.key === store.key);
                            return (
                                <Marker key={`store-${store.key}`} coordinate={store.coordinate} onPress={() => (place ? select(place) : openStore(store))} accessibilityLabel={[store.name, store.statusText].filter(Boolean).join(', ')}>
                                    <MapPin kind='store' active={store.open} selected={!!place && place.key === selectedKey} label={store.name} meta={store.statusText} logoUrl={store.store?.logo_url} />
                                </Marker>
                            );
                        })}
                </MapView>
            ) : (
                <YStack position='absolute' top={0} left={0} right={0} bottom={0} backgroundColor='$surface' />
            )}

            <YStack position='absolute' top={insets.top + 8} left={space.gutter} right={space.gutter} gap={10} zIndex={1100}>
                <XStack justifyContent='space-between' alignItems='center' gap={8}>
                    {locationChip}
                    <XStack alignItems='center' gap={8}>
                        {toggle}
                        <LanguageButton floating />
                    </XStack>
                </XStack>
                {searchBar}
                <XStack gap={8} accessibilityRole='radiogroup' accessibilityLabel={t('FoodTrucks.showOnMap')}>
                    {(['all', 'trucks', 'stores'] as Layer[]).map((value) => {
                        const isSelected = layer === value;
                        return (
                            <Pressable
                                key={value}
                                onPress={() => setLayer(value)}
                                accessibilityRole='radio'
                                accessibilityState={{ selected: isSelected }}
                                style={{ height: 34, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: isSelected ? theme.textPrimary.val : theme.background.val, ...elevation.floating }}
                            >
                                <UIText variant='captionStrong' style={{ color: isSelected ? theme.background.val : theme.textPrimary.val }}>
                                    {t(`FoodTrucks.layer.${value}`)}
                                </UIText>
                            </Pressable>
                        );
                    })}
                </XStack>
            </YStack>

            <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: sheetHeight || undefined, zIndex: 1100, transform: [{ translateY: sheetY }] }}>
                {/* Back to the customer's own position and zone; it rides on top of the sheet. */}
                {!expanded && (
                    <XStack position='absolute' top={-54} right={space.gutter}>
                        <Pressable
                            onPress={recenter}
                            accessibilityRole='button'
                            accessibilityLabel={t('FoodTrucks.recenter')}
                            hitSlop={6}
                            style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background.val, ...elevation.floating }}
                        >
                            <FontAwesomeIcon icon={faCrosshairs} size={18} color={theme.primaryForeground.val} />
                        </Pressable>
                    </XStack>
                )}
                <YStack flex={1} borderTopLeftRadius={radius.sheet} borderTopRightRadius={radius.sheet} backgroundColor='$background' style={elevation.floating}>
                    <YStack onLayout={(event) => setCollapsedHeight(Math.ceil(event.nativeEvent.layout.height))} {...sheetPan.panHandlers}>
                        {/* The handle: drag (anywhere on this part) or tap to show the promotions. */}
                        <Pressable
                            onPress={() => snapSheet(!expanded)}
                            accessibilityRole='button'
                            accessibilityLabel={expanded ? t('FoodTrucks.hidePromotions') : t('FoodTrucks.showPromotions')}
                            accessibilityState={{ expanded }}
                            style={{ paddingTop: 10, paddingBottom: 8, alignItems: 'center', gap: 6 }}
                        >
                            <YStack width={40} height={5} borderRadius={3} backgroundColor='$borderColorWithShadow' />
                            {!expanded && offers.length > 0 && (
                                <UIText variant='captionStrong' tone='brand' style={{ fontSize: 11 }}>
                                    {t('FoodTrucks.promotionsHint', { count: offers.length })}
                                </UIText>
                            )}
                        </Pressable>
                        <YStack paddingHorizontal={space.gutter} paddingBottom={14} gap={12}>
                            {sheetBody}
                        </YStack>
                    </YStack>
                    <YStack flex={1} paddingHorizontal={space.gutter} borderTopWidth={1} borderColor='$borderColor'>
                        <XStack justifyContent='space-between' alignItems='center' paddingTop={14} paddingBottom={4}>
                            <UIText variant='subheading'>{t('FoodTrucks.promotions')}</UIText>
                            {offers.length > 0 && (
                                <Pressable onPress={() => navigation.navigate('Offers')} accessibilityRole='link' style={{ minHeight: 32, justifyContent: 'center' }}>
                                    <UIText variant='captionStrong' tone='brand'>
                                        {t('FoodTrucks.all')}
                                    </UIText>
                                </Pressable>
                            )}
                        </XStack>
                        {offers.length ? (
                            <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                                {offers.map((item) => (
                                    <OfferRow key={item.id} offer={item} now={new Date()} onPress={() => navigation.navigate('Offer', { offerId: item.id, offer: item })} />
                                ))}
                            </ScrollView>
                        ) : (
                            <UIText tone='secondary' style={{ paddingVertical: 12 }}>
                                {t('FoodTrucks.noPromotions')}
                            </UIText>
                        )}
                    </YStack>
                </YStack>
            </Animated.View>
        </YStack>
    );

    const greetingName = String(account?.getAttribute?.('name') ?? '').split(' ')[0];
    const listMode = (
        <YStack flex={1}>
            {/* The greeting, address and search stay at the top while the rest scrolls. */}
            <YStack paddingTop={insets.top + 8} paddingHorizontal={space.gutter} paddingBottom={12} gap={14} backgroundColor='$background' borderBottomWidth={1} borderColor='$borderColor' zIndex={2}>
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
                    <XStack alignItems='center' gap={8}>
                        {toggle}
                        <LanguageButton />
                    </XStack>
                </XStack>
                {searchBar}
            </YStack>
            <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 14, paddingHorizontal: space.gutter, paddingBottom: cart.count > 0 ? 110 : 32, gap: 14 }}>
                {loading ? (
                    <YStack gap={12}>
                        <Skeleton height={92} radius={radius.card} />
                        <XStack gap={10}>
                            <Skeleton width={210} height={64} radius={radius.card} />
                            <Skeleton width={210} height={64} radius={radius.card} />
                        </XStack>
                        <XStack flexWrap='wrap' gap={10}>
                            {categorySkeletons(8, 72)}
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

                        {places.length > 0 ? (
                            <>
                                <UIText variant='heading'>{zone?.name ? t('FoodTrucks.nearYouIn', { zone: zone.name }) : t('FoodTrucks.nearYou')}</UIText>
                                {placeRow}
                                {categoriesHeader}
                                <XStack flexWrap='wrap' gap={10}>
                                    {categoriesLoading ? categorySkeletons(4, 78) : [...categories.slice(0, 7).map((category) => categoryTile(category, 78)), allTile(78)]}
                                </XStack>
                            </>
                        ) : (
                            <YStack gap={8}>
                                <UIText variant='subheading'>{customer ? t('FoodTrucks.outsideTitle') : t('FoodTrucks.whereTitle')}</UIText>
                                <UIText tone='secondary'>{customer ? t('FoodTrucks.outsideBody', { zones: zones.map((item) => item.zoneName).filter(Boolean).join(', ') }) : t('FoodTrucks.whereBody')}</UIText>
                                {placeActions}
                            </YStack>
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
                    </>
                )}
            </ScrollView>
            {/* Pinned above the tab bar, like the store page's cart pill. */}
            <CartPill count={cart.count} total={cart.total} storeName={cart.storeName} onPress={openCart} bottom={28} />
        </YStack>
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

/** A map marker: the truck or store icon with its name and a short line under it. */
function MapPin({ kind, active, selected, label, meta, logoUrl }: { kind: 'truck' | 'store'; active: boolean; selected: boolean; label: string; meta: string | null; logoUrl?: string | null }) {
    return (
        <YStack alignItems='center' gap={3} opacity={active || selected ? 1 : 0.75}>
            <PlaceIcon kind={kind} active={active} size={selected ? 48 : 40} selected={selected} floating logoUrl={logoUrl} />
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
