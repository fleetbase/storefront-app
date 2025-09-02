import React, { useEffect, forwardRef } from 'react';
import { MapContainer, TileLayer, Marker as LeafletMarker, Polyline as LeafletPolyline, Polygon as LeafletPolygon, useMapEvent, useMap } from 'react-leaflet';
import L from 'leaflet';

function regionToCenterAndZoom(region) {
    const { latitude, longitude, latitudeDelta } = region;
    // This is an approximate conversion. Adjust as needed.
    let zoom;
    if (latitudeDelta <= 0.02) zoom = 16;
    else if (latitudeDelta <= 0.05) zoom = 15;
    else if (latitudeDelta <= 0.1) zoom = 14;
    else if (latitudeDelta <= 0.5) zoom = 13;
    else zoom = 12;
    return { center: [latitude, longitude], zoom };
}

function MapEvents({ onRegionChangeComplete, onPress, onPanDrag }) {
    const map = useMap();

    // Fire onRegionChangeComplete when movement ends.
    useMapEvent('moveend', () => {
        if (onRegionChangeComplete) {
            const center = map.getCenter();
            const zoom = map.getZoom();
            // Estimate latitudeDelta from zoom.
            const latitudeDelta = 360 / Math.pow(2, zoom);
            onRegionChangeComplete({
                latitude: center.lat,
                longitude: center.lng,
                latitudeDelta,
                longitudeDelta: latitudeDelta, // rough approximation
            });
        }
    });

    // Attach onPress (click) event.
    useMapEvent('click', (e) => {
        if (onPress) {
            onPress(e);
        }
    });

    // Attach onPanDrag (drag) event.
    useMapEvent('drag', (e) => {
        if (onPanDrag) {
            onPanDrag(e);
        }
    });

    return null;
}

const SetMapRef = ({ setMapRef }) => {
    const map = useMap();

    useEffect(() => {
        if (setMapRef) {
            if (typeof setMapRef === 'function') {
                setMapRef(map);
            } else {
                setMapRef.current = map;
            }
        }
    }, [map, setMapRef]);

    return null;
};

export const MapView = forwardRef((props, ref) => {
    const { initialRegion, style, onRegionChangeComplete, onPress, onPanDrag, mapType = 'standard', scrollEnabled = true, zoomEnabled = true, children, ...rest } = props;
    const { center, zoom } = initialRegion ? regionToCenterAndZoom(initialRegion) : { center: [0, 0], zoom: 1 };
    const tileUrl =
        mapType === 'satellite'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';

    return (
        <MapContainer center={center} zoom={zoom} style={style} scrollWheelZoom={scrollEnabled} zoomControl={zoomEnabled} {...rest}>
            <TileLayer url={tileUrl} />
            <SetMapRef setMapRef={ref} />
            <MapEvents onRegionChangeComplete={onRegionChangeComplete} onPress={onPress} onPanDrag={onPanDrag} />
            {children}
        </MapContainer>
    );
});

export const Marker = (props) => {
    const { coordinate, centerOffset, onPress, children, ...rest } = props;
    const position = [coordinate.latitude, coordinate.longitude];

    // If centerOffset is provided, create a custom icon using a divIcon.
    let icon;
    if (centerOffset) {
        // centerOffset should be an object like { x, y }
        icon = L.divIcon({
            html: '', // We'll let children render inside the Marker instead.
            iconSize: [0, 0],
            iconAnchor: [centerOffset.x, centerOffset.y],
        });
    }
    return (
        <LeafletMarker position={position} icon={icon} eventHandlers={{ click: onPress }} {...rest}>
            {children}
        </LeafletMarker>
    );
};

export const Polyline = ({ coordinates, ...props }) => {
    const { Polyline: LeafletPolyline } = require('react-leaflet');
    const positions = coordinates.map((coord) => [coord.latitude, coord.longitude]);
    return <LeafletPolyline positions={positions} {...props} />;
};

export const Polygon = (props) => {
    const { coordinates, strokeWidth, strokeColor, fillColor, lineDashPattern, ...rest } = props;

    // Convert the array of { latitude, longitude } into Leaflet positions.
    const positions = coordinates.map((coord) => [coord.latitude, coord.longitude]);

    // If a dash pattern is provided, convert it to a string format acceptable by Leaflet.
    const dashArray = lineDashPattern ? (Array.isArray(lineDashPattern) ? lineDashPattern.join(' ') : lineDashPattern) : undefined;

    // Map react-native-maps style props to Leaflet's pathOptions.
    const pathOptions = {
        color: strokeColor, // stroke color
        weight: strokeWidth, // stroke width
        fillColor: fillColor, // fill color
        dashArray, // dash pattern for lines
    };

    return <LeafletPolygon positions={positions} pathOptions={pathOptions} {...rest} />;
};

export class AnimatedRegion {
    constructor(initialValue) {
        this._value = initialValue;
        this._listeners = {};
        this._nextListenerId = 1;
    }
    getValue() {
        return this._value;
    }
    setValue(newValue) {
        this._value = newValue;
        this._notifyListeners();
    }
    addListener(callback) {
        const id = this._nextListenerId++;
        this._listeners[id] = callback;
        return id;
    }
    removeListener(id) {
        delete this._listeners[id];
    }
    _notifyListeners() {
        Object.values(this._listeners).forEach((cb) => cb(this._value));
    }
    timing({ latitude, longitude, duration, easing, useNativeDriver }, callback) {
        const startValue = this._value;
        const startTime = performance.now();
        const animate = () => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Linear interpolation; you can integrate easing if needed.
            const newLatitude = startValue.latitude + (latitude - startValue.latitude) * progress;
            const newLongitude = startValue.longitude + (longitude - startValue.longitude) * progress;
            this._value = {
                ...this._value,
                latitude: newLatitude,
                longitude: newLongitude,
            };
            this._notifyListeners();
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                if (callback) callback();
            }
        };
        return {
            start: () => {
                requestAnimationFrame(animate);
            },
        };
    }
}

export default MapView;
