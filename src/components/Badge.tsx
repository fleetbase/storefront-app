import React from 'react';
import { XStack, YStack, Text } from 'tamagui';
import { titleize } from '../utils/format';

// Map statuses to a base color
function getColorFromStatus(status) {
    status = status?.toLowerCase();

    switch (status) {
        case 'live':
        case 'success':
        case 'operational':
        case 'active':
        case 'completed':
        case 'pickup_ready':
        case 'accepted':
            return 'green';
        case 'dispatched':
        case 'assigned':
            return 'indigo';
        case 'disabled':
        case 'canceled':
        case 'order_canceled':
        case 'incomplete':
        case 'unable':
        case 'failed':
            return 'red';
        case 'created':
        case 'warning':
        case 'preparing':
        case 'pending':
        case 'enroute':
        case 'driver_enroute':
            return 'yellow';
        case 'info':
        case 'in_progress':
            return 'blue';
        default:
            return 'yellow';
    }
}

/**
 * Given a base color and whether it's inverted or not,
 * returns an object with background, border, and text color keys.
 */
function getColorScheme(color, inverted = false) {
    // For inverted: use darkest shades for background and lighter for text
    // For non-inverted: use lightest shades for background and darker for text
    // Assuming colors in the form $color-100 ... $color-900
    if (inverted) {
        return {
            bg: `$${color}-900`,
            border: `$${color}-700`,
            text: `$${color}-50`,
        };
    } else {
        return {
            bg: `$${color}-100`,
            border: `$${color}-300`,
            text: `$${color}-800`,
        };
    }
}

/**
 * Badge Component
 *
 * Props:
 * - status?: string - a status string that determines the color scheme if color not provided
 * - color?: string - a base color (e.g. 'green', 'red', 'blue', etc.) that overrides status-based color
 * - inverted?: boolean - if true, use an inverted color scheme
 * - icon?: ReactNode - optional icon to display
 * - iconPlacement?: 'left' | 'right' - where to place the icon relative to the text
 * - children: string | ReactNode - the text or content inside the badge
 */
const Badge = ({ status, color, inverted = false, icon, iconPlacement = 'left', px = '$3', py = '$2', fontSize = '$2', children, ...props }) => {
    let baseColor = color;

    if (!baseColor && status) {
        baseColor = getColorFromStatus(status);
    }

    // If no color or status provided, default to 'yellow'
    if (!baseColor) {
        baseColor = 'yellow';
    }

    const { bg, border, text } = getColorScheme(baseColor, inverted);

    const iconElement = icon ? (
        <YStack marginRight={iconPlacement === 'left' ? '$2' : undefined} marginLeft={iconPlacement === 'right' ? '$2' : undefined}>
            {icon}
        </YStack>
    ) : null;

    return (
        <XStack alignItems='center' borderRadius='$4' borderWidth={1} backgroundColor={bg} borderColor={border} px={px} py={py} space='$1' {...props}>
            {iconPlacement === 'left' && iconElement}
            {status && (
                <Text color={text} fontWeight='bold' fontSize={fontSize}>
                    {titleize(status)}
                </Text>
            )}
            {children}
            {iconPlacement === 'right' && iconElement}
        </XStack>
    );
};

export default Badge;
