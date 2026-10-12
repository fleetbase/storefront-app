import React, { useState } from 'react';
import { Image } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faIndustry, faStore, faTruck, faWarehouse } from '@fortawesome/free-solid-svg-icons';
import { YStack, useTheme } from 'tamagui';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import { elevation } from '../../ui';

/** How stores show on the map, set by the storefront owner (`options.map_marker`). */
export type StoreMarker = 'store' | 'warehouse' | 'factory' | 'logo';

const STORE_ICONS = { store: faStore, warehouse: faWarehouse, factory: faIndustry };

/** The owner's store marker: the Network's for a Network, the store's own otherwise. */
export function storeMarkerOf(owner: any): StoreMarker {
    const value = owner?.options?.map_marker;
    return value === 'warehouse' || value === 'factory' || value === 'logo' ? value : 'store';
}

/**
 * The icon for a truck or a store, the same on the map, in the "Near you" row and in
 * search: a live truck in the brand color, an offline truck greyed out, a store in amber.
 * Stores use the icon the owner chose (store, warehouse or factory), or the store's logo,
 * falling back to the store icon when there is no logo or it fails to load.
 */
export function PlaceIcon({
    kind,
    active,
    size = 40,
    selected = false,
    floating = false,
    logoUrl,
}: {
    kind: 'truck' | 'store';
    active: boolean;
    size?: number;
    selected?: boolean;
    floating?: boolean;
    logoUrl?: string | null;
}) {
    const theme = useTheme();
    const { ownerInfo } = useStorefrontRuntime();
    const [logoFailed, setLogoFailed] = useState(false);
    const marker = storeMarkerOf(ownerInfo);
    const showLogo = kind === 'store' && marker === 'logo' && !!logoUrl && !logoFailed;
    const background = showLogo ? '#ffffff' : kind === 'store' ? theme.warning.val : active ? theme.primary.val : theme.surface2.val;
    const foreground = kind === 'store' ? '#ffffff' : active ? theme.primaryText.val : theme.textSecondary.val;
    const icon = kind === 'truck' ? faTruck : STORE_ICONS[marker === 'logo' ? 'store' : marker];
    return (
        <YStack
            width={size}
            height={size}
            borderRadius={Math.round(size * 0.3)}
            borderWidth={selected ? 3 : floating ? 2 : 0}
            borderColor={selected ? '$primary' : '$background'}
            alignItems='center'
            justifyContent='center'
            overflow='hidden'
            style={{ backgroundColor: background, ...(floating ? elevation.floating : {}) }}
            accessibilityElementsHidden
        >
            {showLogo ? (
                <Image source={{ uri: logoUrl! }} style={{ width: '100%', height: '100%' }} resizeMode='cover' onError={() => setLogoFailed(true)} />
            ) : (
                <FontAwesomeIcon icon={icon} size={Math.round(size * 0.42)} color={foreground} />
            )}
        </YStack>
    );
}

export default PlaceIcon;
