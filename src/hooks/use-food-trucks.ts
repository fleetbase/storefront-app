import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';
import { useLanguage } from '../contexts/LanguageContext';
import useStorefront from './use-storefront';
import useStoreLocations from './use-store-locations';
import useCustomerCoordinates from './use-customer-coordinates';
import { customerZone, insideZone, pointOf, summarizeTruck, type LatLng, type TruckSummary } from '../commerce/food-trucks';
import { getMappableNetworkLocations, getNetworkLocationCoordinates } from '../network/network-runtime';
import { distanceMeters } from '../network/map';
import { formatDistance, storeSummary, usesTwelveHourClock } from '../ui';

/** How often live truck positions refresh while the screen is open. */
const REFRESH_MS = 30000;

export type StorePin = { key: string; storeId: string | null; name: string; coordinate: LatLng; statusText: string | null; open: boolean; distance: string | null; store: any; location: any };
export type TruckPin = TruckSummary & { distance: string | null; meters: number | null; inZone: boolean };

/**
 * Everything the Trucks screens show: the trucks (a store's own, or in a Network every
 * member store's), the stores alongside them (the store's locations, or the Network's
 * stores), where the customer is and which truck zone that falls in.
 */
export default function useFoodTrucks() {
    const { storefront } = useStorefront();
    const { mode, network, ownerInfo } = useStorefrontRuntime();
    const { t, locale } = useLanguage();
    const hour12 = usesTwelveHourClock(locale);
    const { storeLocations } = useStoreLocations();
    const { point: customer } = useCustomerCoordinates();
    const [rawTrucks, setRawTrucks] = useState<any[] | null>(null);
    const [networkLocations, setNetworkLocations] = useState<any[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const [retry, setRetry] = useState(0);

    const loadTrucks = useCallback(async () => {
        if (!storefront?.foodTrucks) return;
        try {
            const result = await storefront.foodTrucks.query({ limit: -1 });
            setRawTrucks((Array.from(result || []) as any[]).map((truck) => (typeof truck.serialize === 'function' ? truck.serialize() : truck)).filter((truck) => truck?.vehicle));
            setError(null);
        } catch (loadError: any) {
            setError(loadError);
        }
    }, [storefront]);

    useEffect(() => {
        loadTrucks();
        const timer = setInterval(loadTrucks, REFRESH_MS);
        return () => clearInterval(timer);
    }, [loadTrucks, retry]);

    useEffect(() => {
        if (mode !== 'network' || !network) return;
        let active = true;
        network
            .getStoreLocations({ with_store: true, limit: 100 })
            .then((result: any) => active && setNetworkLocations(getMappableNetworkLocations(Array.from(result || []))))
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [mode, network]);

    const trucks = useMemo<TruckPin[] | null>(() => {
        if (!rawTrucks) return null;
        const summaries = rawTrucks.map(summarizeTruck);
        const zone = customerZone(summaries, customer);
        return summaries
            .map((truck) => {
                const meters = customer && truck.coordinate ? distanceMeters(customer, truck.coordinate) : null;
                return { ...truck, meters, distance: formatDistance(meters), inZone: !!zone && (truck.zoneId === zone.id || insideZone(customer, truck.zoneBorder)) };
            })
            .sort((a, b) => Number(b.live) - Number(a.live) || (a.meters ?? Infinity) - (b.meters ?? Infinity));
    }, [customer, rawTrucks]);

    const zone = useMemo(() => (trucks ? customerZone(trucks, customer) : null), [customer, trucks]);

    const stores = useMemo<StorePin[]>(() => {
        const toPin = (key: string, storeData: any, location: any, coordinate: LatLng | null): StorePin | null => {
            if (!coordinate) return null;
            const summary = storeSummary({ ...storeData, locations: [{ hours: location?.getAttribute?.('hours') ?? location?.hours ?? [] }] }, { t, hour12 });
            const meters = customer ? distanceMeters(customer, coordinate) : null;
            return {
                key,
                storeId: summary.id,
                name: (mode === 'network' ? summary.name : location?.getAttribute?.('name') || summary.name) || '',
                coordinate,
                statusText: summary.statusText,
                open: !summary.muted,
                distance: formatDistance(meters),
                store: storeData,
                location,
            };
        };
        const pins =
            mode === 'network'
                ? networkLocations.map((location: any) => toPin(location.id, location.getAttribute?.('store_data') ?? location.getAttribute?.('store'), location, getNetworkLocationCoordinates(location)))
                : storeLocations.map((location: any) => toPin(location.id, ownerInfo, location, pointOf(location.getAttribute?.('place')?.location ?? location.getAttribute?.('place.location'))));
        return (pins.filter(Boolean) as StorePin[]).sort((a, b) => (customer ? distanceMeters(customer, a.coordinate) - distanceMeters(customer, b.coordinate) : 0));
    }, [customer, hour12, mode, networkLocations, ownerInfo, storeLocations, t]);

    return {
        trucks,
        stores,
        customer,
        zone,
        loading: rawTrucks === null && !error,
        error,
        reload: () => setRetry((value) => value + 1),
    };
}
