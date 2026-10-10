import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStore, faTruck } from '@fortawesome/free-solid-svg-icons';
import { YStack, useTheme } from 'tamagui';
import { elevation } from '../../ui';

/**
 * The icon for a truck or a store, the same on the map, in the "Near you" row and in
 * search: a live truck in the brand color, an offline truck greyed out, a store in amber.
 */
export function PlaceIcon({ kind, active, size = 40, selected = false, floating = false }: { kind: 'truck' | 'store'; active: boolean; size?: number; selected?: boolean; floating?: boolean }) {
    const theme = useTheme();
    const background = kind === 'store' ? theme.warning.val : active ? theme.primary.val : theme.surface2.val;
    const foreground = kind === 'store' ? '#ffffff' : active ? theme.primaryText.val : theme.textSecondary.val;
    return (
        <YStack
            width={size}
            height={size}
            borderRadius={Math.round(size * 0.3)}
            borderWidth={selected ? 3 : floating ? 2 : 0}
            borderColor={selected ? '$primary' : '$background'}
            alignItems='center'
            justifyContent='center'
            style={{ backgroundColor: background, ...(floating ? elevation.floating : {}) }}
            accessibilityElementsHidden
        >
            <FontAwesomeIcon icon={kind === 'truck' ? faTruck : faStore} size={Math.round(size * 0.42)} color={foreground} />
        </YStack>
    );
}

export default PlaceIcon;
