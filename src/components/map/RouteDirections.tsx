import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Polyline } from 'react-native-maps';
import { config } from '../../utils';
import {
    COMPUTE_ROUTES_URL,
    ROUTES_FIELD_MASK,
    computeRoutesRequestBody,
    googleHeaders,
    isRoutePoint,
    routeFromComputeRoutes,
    type LatLng,
    type RoutePoint,
    type RouteResult,
    type TravelMode,
} from '../../utils/google-maps';

export type RouteDirectionsProps = {
    origin?: RoutePoint | null;
    destination?: RoutePoint | null;
    waypoints?: RoutePoint[];
    apikey?: string;
    mode?: TravelMode;
    strokeWidth?: number;
    strokeColor?: string;
    lineDashPattern?: number[];
    onStart?: (params: { origin: RoutePoint; destination: RoutePoint; waypoints: RoutePoint[] }) => void;
    onReady?: (result: RouteResult) => void;
    onError?: (message: string) => void;
    [polylineProp: string]: any;
};

/**
 * Draws the road route between two points on the surrounding MapView, from the Routes API.
 * Takes the same props as react-native-maps-directions, which called the legacy Directions API.
 */
const RouteDirections = ({ origin, destination, waypoints = [], apikey, mode = 'DRIVING', onStart, onReady, onError, ...polylineProps }: RouteDirectionsProps) => {
    const [coordinates, setCoordinates] = useState<LatLng[]>([]);
    const callbacks = useRef({ onStart, onReady, onError });
    callbacks.current = { onStart, onReady, onError };

    const key = apikey ?? config('GOOGLE_MAPS_API_KEY');
    const stops = isRoutePoint(origin) && isRoutePoint(destination) ? { origin, destination, waypoints: waypoints.filter(isRoutePoint) } : null;
    // Screens build new coordinate objects on every render; only a different route refetches.
    const routeKey = stops ? JSON.stringify([stops, mode, key]) : null;

    useEffect(() => {
        if (!routeKey || !stops) {
            setCoordinates([]);
            return;
        }

        let active = true;
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        callbacks.current.onStart?.(stops);

        axios
            .post(COMPUTE_ROUTES_URL, computeRoutesRequestBody(stops.origin, stops.destination, { waypoints: stops.waypoints, mode }), {
                headers: googleHeaders(key, ROUTES_FIELD_MASK),
                signal: controller?.signal,
            })
            .then((response) => {
                if (!active) return;
                const route = routeFromComputeRoutes(response.data);
                if (!route || route.coordinates.length < 2) {
                    throw new Error('No route found');
                }
                setCoordinates(route.coordinates);
                callbacks.current.onReady?.(route);
            })
            .catch((error) => {
                if (!active || axios.isCancel(error)) return;
                const message = error?.response?.data?.error?.message ?? error?.message ?? String(error);
                setCoordinates([]);
                console.warn('Routes API error:', message);
                callbacks.current.onError?.(message);
            });

        return () => {
            active = false;
            controller?.abort();
        };
        // routeKey covers origin, destination, waypoints, mode and key.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeKey]);

    if (coordinates.length < 2) {
        return null;
    }

    return <Polyline coordinates={coordinates} {...polylineProps} />;
};

export default RouteDirections;
