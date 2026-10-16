import { useMemo } from 'react';
import useCurrentLocation from './use-current-location';
import { getCoordinates } from '../utils/location';
import { isValidCoordinate, type LatLng } from '../network/map';

/**
 * The customer's current location as `[latitude, longitude]` (the store API's `location`
 * parameter) and as a point, or null when unknown. Memoized by value: the stored place is
 * restored as a new object on re-renders, which would otherwise refetch on every render.
 */
export default function useCustomerCoordinates(): { coordinates: [number, number] | null; point: LatLng | null } {
    const { currentLocation } = useCurrentLocation();
    const [latitude, longitude] = currentLocation ? getCoordinates(currentLocation).map(Number) : [Number.NaN, Number.NaN];
    const valid = isValidCoordinate({ latitude, longitude });
    const key = valid ? `${latitude},${longitude}` : null;

    return useMemo(() => {
        if (!key) return { coordinates: null, point: null };
        const [lat, lng] = key.split(',').map(Number);
        return { coordinates: [lat, lng], point: { latitude: lat, longitude: lng } };
    }, [key]);
}
