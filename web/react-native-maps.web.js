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

// react-native-maps methods used by screens, added to the Leaflet map instance so existing
// callers that use the Leaflet API directly keep working.
function withNativeMethods(map) {
    if (!map.animateToRegion) {
        map.animateToRegion = (region, duration = 350) => {
            const { center, zoom } = regionToCenterAndZoom(region);
            map.flyTo(center, zoom, { duration: duration / 1000 });
        };
    }
    if (!map.fitToCoordinates) {
        map.fitToCoordinates = (coordinates = [], options = {}) => {
            if (!coordinates.length) return;
            const padding = options.edgePadding ? Math.max(options.edgePadding.top || 0, options.edgePadding.left || 0) : 24;
            map.fitBounds(
                coordinates.map((coordinate) => [coordinate.latitude, coordinate.longitude]),
                { padding: [padding, padding], animate: options.animated !== false }
            );
        };
    }
    return map;
}

const SetMapRef = ({ setMapRef }) => {
    const map = useMap();

    useEffect(() => {
        withNativeMethods(map);
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
        mapType === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    return (
        <MapContainer center={center} zoom={zoom} style={style} scrollWheelZoom={scrollEnabled} touchZoom={zoomEnabled !== false} zoomControl={false} {...rest}>
            <TileLayer url={tileUrl} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
            <SetMapRef setMapRef={ref} />
            <MapEvents onRegionChangeComplete={onRegionChangeComplete} onPress={onPress} onPanDrag={onPanDrag} />
            {children}
        </MapContainer>
    );
});

export const Marker = (props) => {
    const { coordinate, centerOffset, onPress, children, webIconHtml, webIconSize = 40, ...rest } = props;
    const position = [coordinate.latitude, coordinate.longitude];

    // Leaflet cannot render React children as the marker itself. Screens can pass the
    // marker as an HTML string (`webIconHtml`) for a custom marker on the web.
    let icon;
    if (webIconHtml) {
        icon = L.divIcon({ html: webIconHtml, className: '', iconSize: [webIconSize, webIconSize], iconAnchor: [webIconSize / 2, webIconSize / 2] });
        return <LeafletMarker position={position} icon={icon} eventHandlers={{ click: onPress }} {...rest} />;
    }
    // If centerOffset is provided, create a custom icon using a divIcon.
    if (centerOffset) {
        // centerOffset should be an object like { x, y }
        icon = L.divIcon({
            html: '', // We'll let children render inside the Marker instead.
            iconSize: [0, 0],
            iconAnchor: [centerOffset.x, centerOffset.y],
        });
    }
    // Passing `icon={undefined}` would replace Leaflet's default icon with nothing, so
    // markers without their own icon get a plain dot.
    return (
        <LeafletMarker position={position} icon={icon ?? defaultIcon()} eventHandlers={{ click: onPress }} {...rest}>
            {children}
        </LeafletMarker>
    );
};

let dotIcon;
function defaultIcon() {
    dotIcon ??= L.divIcon({
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#1d4ed8;border:3px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>',
        className: '',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
    });
    return dotIcon;
}

export const Polyline = ({ coordinates, strokeColor, strokeWidth, lineDashPattern, ...props }) => {
    const { Polyline: LeafletPolyline } = require('react-leaflet');
    const positions = coordinates.map((coord) => [coord.latitude, coord.longitude]);
    // Map react-native-maps line styling onto Leaflet's path options.
    const pathOptions = {
        ...(strokeColor ? { color: strokeColor } : {}),
        ...(strokeWidth ? { weight: strokeWidth } : {}),
        ...(lineDashPattern ? { dashArray: Array.isArray(lineDashPattern) ? lineDashPattern.join(' ') : lineDashPattern } : {}),
    };
    return <LeafletPolyline positions={positions} pathOptions={pathOptions} {...props} />;
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
