import React, { useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Marker } from 'react-native-maps';
import TrackingMarker from './TrackingMarker';
import useSocketClusterClient from '../hooks/use-socket-cluster-client';
import useEventBuffer from '../hooks/use-event-buffer';
import { makeCoordinatesFloat } from '../utils/location';
import { haversine } from '../utils/math';

const VehicleMarker = ({ vehicle, onPositionChange, onHeadingChange, onMovement, ...props }) => {
    const markerRef = useRef();
    const listenerRef = useRef();
    const lastCoordinatesRef = useRef(null);

    const handleEvent = useCallback(
        (data) => {
            let movementData = { data };

            if (data.location && data.location.coordinates) {
                const [longitude, latitude] = data.location.coordinates;
                let duration = 1000; // Default duration

                // Calculate dynamic duration based on distance and speed
                if (lastCoordinatesRef.current) {
                    const [prevLng, prevLat] = lastCoordinatesRef.current;

                    // Haversine distance in meters
                    const distance = haversine([latitude, longitude], [prevLat, prevLng], 'meters');
                    const speed = data.speed; // Speed is assumed to be in meters per second (m/s)

                    if (speed && speed > 0) {
                        // Time = Distance / Speed (in seconds)
                        const timeInSeconds = distance / speed;
                        duration = Math.max(100, Math.min(timeInSeconds * 1000, 5000)); // Clamp between 100ms and 5000ms
                    } else if (distance > 0) {
                        // If no speed, use a fixed speed (e.g., 10 m/s) to estimate duration
                        const fixedSpeed = 10; // 10 m/s is 36 km/h
                        const timeInSeconds = distance / fixedSpeed;
                        duration = Math.max(100, Math.min(timeInSeconds * 1000, 5000));
                    }
                }

                // Update last coordinates for the next event's calculation
                lastCoordinatesRef.current = [longitude, latitude];

                if (markerRef.current) {
                    // TrackingMarker's move function expects (latitude, longitude, duration)
                    markerRef.current.move(latitude, longitude, duration);
                }

                if (typeof onPositionChange === 'function') {
                    onPositionChange({ latitude, longitude });
                }

                movementData = { ...movementData, coordinates: { latitude, longitude }, duration };
            }

            if (typeof data.heading === 'number') {
                if (markerRef.current) {
                    markerRef.current.rotate(data.heading);
                }

                if (typeof onHeadingChange === 'function') {
                    onHeadingChange(data.heading);
                }

                movementData = { ...movementData, heading: data.heading };
            }

            if (typeof onMovement === 'function') {
                onMovement(movementData);
            }
        },
        [onPositionChange, onHeadingChange, onMovement]
    );

    const { listen } = useSocketClusterClient();
    const { addEvent, clearEvents } = useEventBuffer(handleEvent);

    const addEventRef = useRef(addEvent);
    const clearEventsRef = useRef(clearEvents);

    useFocusEffect(
        useCallback(() => {
            const trackVehicleMovement = async () => {
                const listener = await listen(`vehicle.${vehicle.id}`, (event) => {
                    addEventRef.current(event);
                });
                if (listener) {
                    listenerRef.current = listener;
                }
            };

            trackVehicleMovement();

            return () => {
                if (listenerRef.current) {
                    listenerRef.current.stop();
                }
                clearEvents();
                lastCoordinatesRef.current = null; // Reset on unmount
            };
        }, [listen, vehicle.id])
    );

    const heading = vehicle.getAttribute('heading') ?? 0;
    const latitude = vehicle.getAttribute('location.coordinates.1');
    const longitude = vehicle.getAttribute('location.coordinates.0');
    // Don't render if coordinates are invalid
    if (!latitude || !longitude || isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
        console.warn('[VehicleMarker] Invalid coordinates, skipping render:', { latitude, longitude });
        return null;
    }

    const coord = makeCoordinatesFloat({ latitude, longitude });
    const avatarUrl = vehicle.getAttribute('avatar_url');
    // On Android, always use local PNG to avoid SVG rendering issues
    const avatarSource = (Platform.OS === 'android' || !avatarUrl) 
        ? require('../../assets/images/vehicles/light_commercial_van.png')
        : { uri: avatarUrl };

    console.log('[VehicleMarker] Render:', {
        vehicleId: vehicle.id,
        latitude: vehicle.getAttribute('location.coordinates.1'),
        longitude: vehicle.getAttribute('location.coordinates.0'),
        hasLocation: !!vehicle.getAttribute('location'),
    });

    // Initialize last coordinates with the vehicle's initial position
    useEffect(() => {
        if (latitude && longitude && !lastCoordinatesRef.current) {
            lastCoordinatesRef.current = [longitude, latitude];
        }
    }, [latitude, longitude]);

    // Event buffer method refs
    useEffect(() => {
        addEventRef.current = addEvent;
        clearEventsRef.current = clearEvents;
    }, [addEvent, clearEvents]);

    return <TrackingMarker ref={markerRef} coordinate={coord} initialRotation={heading} imageSource={avatarSource} size={{ width: 50, height: 50 }} {...props} />;
};

export default VehicleMarker;
