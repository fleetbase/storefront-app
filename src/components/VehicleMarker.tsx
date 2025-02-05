import React, { useRef, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import TrackingMarker from './TrackingMarker';
import useSocketClusterClient from '../hooks/use-socket-cluster-client';
import useEventBuffer from '../hooks/use-event-buffer';
import { getCoordinates } from '../utils/location';

const VehicleMarker = ({ vehicle, onPositionChange, onHeadingChange, onMovement, ...props }) => {
    const markerRef = useRef();
    const listenerRef = useRef();
    const handleEvent = useCallback((data) => {
        console.log('Incoming data:', data);
        const movementData = { data };

        if (data.location && data.location.coordinates) {
            const [latitude, longitude] = data.location.coordinates;
            if (markerRef.current) {
                markerRef.current.move(latitude, longitude);
            }

            if (typeof onPositionChange === 'function') {
                onPositionChange({ latitude, longitude });
            }

            movementData = { ...movementData, coordinates: { latitude, longitude } };
        }

        if (typeof data.heading === 'number') {
            if (markerRef.current) {
                markerRef.current.rotate(data.heading);
            }

            if (typeof onPositionChange === 'function') {
                onHeadingChange(data.heading);
            }

            movementData = { ...movementData, heading: data.heading };
        }

        if (typeof onMovement === 'function') {
            onMovement(movementData);
        }
    }, []);
    const { listen } = useSocketClusterClient();
    const { addEvent, clearEvents } = useEventBuffer(handleEvent);

    useFocusEffect(
        useCallback(() => {
            const trackDriverMovement = async () => {
                const listener = await listen(`vehicle.${vehicle.id}`, (event) => addEvent(event));
                if (listener) {
                    listenerRef.current = listener;
                }
            };

            trackDriverMovement();

            return () => {
                if (listenerRef.current) {
                    listenerRef.current.stop();
                }
                clearEvents();
            };
        }, [listen, vehicle.id])
    );

    const [latitude, longitude] = getCoordinates(vehicle);
    console.log(`${vehicle.id} coordinates: ${latitude} ${longitude}`);
    return <TrackingMarker ref={markerRef} coordinate={{ latitude, longitude }} imageSource={{ uri: vehicle.getAttribute('avatar_url') }} size={{ width: 50, height: 50 }} {...props} />;
};

export default VehicleMarker;
