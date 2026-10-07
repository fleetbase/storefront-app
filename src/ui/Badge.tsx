import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { XStack, useTheme } from 'tamagui';
import { UIText } from './Text';
import { radius } from './tokens';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'error' | 'scrim' | 'light';

export type BadgeProps = { label: string; tone?: BadgeTone; icon?: IconDefinition; size?: 'sm' | 'md' };

/** A small status label: "Out of stock", "Book online", "Sale", "Required". */
export function Badge({ label, tone = 'neutral', icon, size = 'md' }: BadgeProps) {
    const theme = useTheme();
    const colors = {
        neutral: [theme.surface.val, theme.textSecondary.val],
        brand: [theme.primarySoft.val, theme.primaryForeground.val],
        success: [theme.successSoft.val, theme.successForeground.val],
        warning: [theme.warningSoft.val, theme.warningForeground.val],
        error: [theme.error.val, '#ffffff'],
        scrim: ['rgba(13,17,23,0.8)', '#ffffff'],
        light: ['rgba(255,255,255,0.94)', '#14171c'],
    }[tone];

    return (
        <XStack
            alignSelf='flex-start'
            alignItems='center'
            gap={4}
            paddingHorizontal={size === 'sm' ? 7 : 10}
            paddingVertical={size === 'sm' ? 2 : 4}
            borderRadius={radius.pill}
            style={{ backgroundColor: colors[0] }}
        >
            {icon && <FontAwesomeIcon icon={icon} size={11} color={colors[1]} />}
            <UIText variant='captionStrong' style={{ color: colors[1], fontSize: size === 'sm' ? 11 : 12, lineHeight: 16 }} numberOfLines={1}>
                {label}
            </UIText>
        </XStack>
    );
}
