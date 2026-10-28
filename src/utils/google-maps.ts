/* eslint-disable no-bitwise -- polyline decoding and session ids are bit arithmetic */

/**
 * Requests and responses for the Google Maps web services the app calls from the phone.
 *
 * The legacy Places API and Directions API can't be turned on in new Google Cloud projects
 * (https://developers.google.com/maps/legacy), so address search uses Places API (New) and
 * route lines use the Routes API. The results are reshaped into the legacy forms the screens
 * already read: autocomplete predictions with `description` and `place_id`, place details
 * with `geometry` and `address_components`.
 */

export type LatLng = { latitude: number; longitude: number };

/** A route stop: coordinates, or an address Google can geocode. */
export type RoutePoint = LatLng | string;

export type TravelMode = 'DRIVING' | 'BICYCLING' | 'WALKING' | 'TRANSIT';

export type Prediction = { description: string; place_id: string };

export type AddressComponent = { long_name: string; short_name: string; types: string[] };

export type PlaceDetails = {
    place_id: string;
    name: string | null;
    formatted_address: string;
    types: string[];
    geometry: { location: { lat: number; lng: number } } | null;
    address_components: AddressComponent[];
};

/** Same units as react-native-maps-directions: kilometres and minutes. */
export type RouteResult = { coordinates: LatLng[]; distance: number; duration: number };

export const PLACES_AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
export const AUTOCOMPLETE_FIELD_MASK = 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text';
export const PLACE_DETAILS_FIELD_MASK = 'id,displayName,formattedAddress,location,types,addressComponents';
export const COMPUTE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
export const ROUTES_FIELD_MASK = 'routes.polyline.encodedPolyline,routes.duration,routes.distanceMeters';

const AUTOCOMPLETE_BIAS_RADIUS_METERS = 5000;

const TRAVEL_MODES: Record<TravelMode, string> = {
    DRIVING: 'DRIVE',
    BICYCLING: 'BICYCLE',
    WALKING: 'WALK',
    TRANSIT: 'TRANSIT',
};

/**
 * Where a Google Maps web service request goes. A hosted preview sets GOOGLE_MAPS_PROXY to a server
 * that adds its own key, so the page carries none: `https://places.googleapis.com/v1/…` is sent to
 * `<proxy>/places/v1/…`. Without a proxy the URL is unchanged.
 */
export function googleUrl(url: string, proxy?: string | null): string {
    const match = proxy ? /^https:\/\/(maps|places|routes)\.googleapis\.com\//.exec(url) : null;
    return match ? `${proxy!.replace(/\/+$/, '')}/${match[1]}/${url.slice(match[0].length)}` : url;
}

export function placeDetailsUrl(placeId: string): string {
    return `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
}

export function googleHeaders(apiKey: string, fieldMask: string): Record<string, string> {
    return { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': fieldMask };
}

/** A random id that ties autocomplete requests to the place details call they lead to, so Google bills them as one session. */
export function createSessionToken(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const random = (Math.random() * 16) | 0;
        return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
    });
}

export function autocompleteRequestBody(
    input: string,
    { languageCode, coordinates, sessionToken }: { languageCode?: string | null; coordinates?: number[] | null; sessionToken?: string | null } = {}
): Record<string, any> {
    const body: Record<string, any> = { input };
    if (languageCode) {
        body.languageCode = languageCode;
    }
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
        const latitude = Number(coordinates[0]);
        const longitude = Number(coordinates[1]);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            body.locationBias = { circle: { center: { latitude, longitude }, radius: AUTOCOMPLETE_BIAS_RADIUS_METERS } };
        }
    }
    if (sessionToken) {
        body.sessionToken = sessionToken;
    }
    return body;
}

export function predictionsFromAutocomplete(data: any): Prediction[] {
    const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
    return suggestions
        .map((suggestion: any) => suggestion?.placePrediction)
        .filter((prediction: any) => prediction?.placeId && prediction?.text?.text)
        .map((prediction: any) => ({ description: prediction.text.text, place_id: prediction.placeId }));
}

export function placeDetailsFromPlace(place: any): PlaceDetails | null {
    if (!place || typeof place !== 'object') {
        return null;
    }

    const latitude = Number(place.location?.latitude);
    const longitude = Number(place.location?.longitude);
    const components = Array.isArray(place.addressComponents) ? place.addressComponents : [];

    return {
        place_id: place.id ?? null,
        name: place.displayName?.text ?? null,
        formatted_address: place.formattedAddress ?? '',
        types: Array.isArray(place.types) ? place.types : [],
        geometry: Number.isFinite(latitude) && Number.isFinite(longitude) ? { location: { lat: latitude, lng: longitude } } : null,
        address_components: components.map((component: any) => ({
            long_name: component.longText ?? '',
            short_name: component.shortText ?? component.longText ?? '',
            types: Array.isArray(component.types) ? component.types : [],
        })),
    };
}

function routeWaypoint(point: RoutePoint): Record<string, any> {
    if (typeof point === 'string') {
        return { address: point };
    }
    return { location: { latLng: { latitude: Number(point.latitude), longitude: Number(point.longitude) } } };
}

export function isRoutePoint(point: unknown): point is RoutePoint {
    if (typeof point === 'string') {
        return point.trim().length > 0;
    }
    const candidate = point as Partial<LatLng> | null | undefined;
    if (!candidate || candidate.latitude == null || candidate.longitude == null) {
        return false;
    }
    return Number.isFinite(Number(candidate.latitude)) && Number.isFinite(Number(candidate.longitude));
}

export function computeRoutesRequestBody(
    origin: RoutePoint,
    destination: RoutePoint,
    { waypoints = [], mode = 'DRIVING' }: { waypoints?: RoutePoint[]; mode?: TravelMode } = {}
): Record<string, any> {
    const body: Record<string, any> = {
        origin: routeWaypoint(origin),
        destination: routeWaypoint(destination),
        travelMode: TRAVEL_MODES[mode] ?? TRAVEL_MODES.DRIVING,
        polylineEncoding: 'ENCODED_POLYLINE',
    };
    const intermediates = waypoints.filter(isRoutePoint);
    if (intermediates.length) {
        body.intermediates = intermediates.map(routeWaypoint);
    }
    return body;
}

/** Routes API durations are strings like "754s". */
function parseDurationSeconds(duration: unknown): number {
    const seconds = parseFloat(String(duration ?? '0'));
    return Number.isFinite(seconds) ? seconds : 0;
}

export function routeFromComputeRoutes(data: any): RouteResult | null {
    const route = Array.isArray(data?.routes) ? data.routes[0] : null;
    const encoded = route?.polyline?.encodedPolyline;
    if (!encoded) {
        return null;
    }

    return {
        coordinates: decodePolyline(encoded),
        distance: (Number(route.distanceMeters) || 0) / 1000,
        duration: parseDurationSeconds(route.duration) / 60,
    };
}

/** Decodes Google's encoded polyline format (https://developers.google.com/maps/documentation/utilities/polylinealgorithm). */
export function decodePolyline(encoded: string, precision = 5): LatLng[] {
    const factor = Math.pow(10, precision);
    const coordinates: LatLng[] = [];
    let index = 0;
    let latitude = 0;
    let longitude = 0;

    const nextValue = (): number | null => {
        let result = 0;
        let shift = 0;
        let byte: number;
        do {
            if (index >= encoded.length) {
                return null;
            }
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        return result & 1 ? ~(result >> 1) : result >> 1;
    };

    while (index < encoded.length) {
        const latitudeChange = nextValue();
        const longitudeChange = nextValue();
        if (latitudeChange === null || longitudeChange === null) {
            break;
        }
        latitude += latitudeChange;
        longitude += longitudeChange;
        coordinates.push({ latitude: latitude / factor, longitude: longitude / factor });
    }

    return coordinates;
}
