import React from 'react';
import { Marker } from 'react-native-maps';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHouse, faPerson } from '@fortawesome/free-solid-svg-icons';
import { YStack, useTheme } from 'tamagui';
import { initials } from '../../commerce/route-preview';
import { StoreLogo, elevation } from '../../ui';

type LatLng = { latitude: number; longitude: number };

/** The store a route starts or ends at: its initials on a round tile, as in the design. */
export function StoreMapMarker({ coordinate, name }: { coordinate: LatLng; name: string | null | undefined }) {
    const theme = useTheme();
    return (
        <Marker
            coordinate={coordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            title={name ?? undefined}
            {...({ webIconHtml: tileHtml(initials(name), theme.textPrimary.val), webIconSize: 34 } as object)}
        >
            <YStack borderRadius={17} borderWidth={3} borderColor='$background' style={elevation.floating}>
                <StoreLogo uri={null} name={name ?? '?'} size={28} radius={14} />
            </YStack>
        </Marker>
    );
}

/** Where the order goes (a house) or, for pickup, where the customer is (a person). */
export function PlaceMapMarker({ coordinate, title, kind = 'home' }: { coordinate: LatLng; title?: string; kind?: 'home' | 'person' }) {
    const theme = useTheme();
    return (
        <Marker
            coordinate={coordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            title={title}
            {...({ webIconHtml: circleHtml(theme.textPrimary.val), webIconSize: 32 } as object)}
        >
            <YStack
                width={32}
                height={32}
                borderRadius={16}
                backgroundColor='$textPrimary'
                borderWidth={3}
                borderColor='$background'
                alignItems='center'
                justifyContent='center'
                style={elevation.floating}
            >
                <FontAwesomeIcon icon={kind === 'person' ? faPerson : faHouse} size={13} color={theme.background.val} />
            </YStack>
        </Marker>
    );
}

// Leaflet on the web draws markers from HTML rather than React views.
function tileHtml(text: string, color: string): string {
    return `<div style="width:34px;height:34px;border-radius:50%;background:${color};border:3px solid #fff;box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:#fff;font:800 10px system-ui">${text}</div>`;
}

function circleHtml(color: string): string {
    return `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:3px solid #fff;box-sizing:border-box"></div>`;
}
