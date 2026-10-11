import React from 'react';
import { Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { XStack, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { useBranding } from '../branding/BrandingProvider';
import { UIText } from './Text';
import { HIT_SIZE, radius } from './tokens';

export type ChipProps = {
    label: string;
    selected?: boolean;
    onPress?: () => void;
    /** Shows a remove affordance and announces the chip as removable. */
    onRemove?: () => void;
    icon?: IconDefinition;
    /** `filled` chips sit on a neutral surface; `outline` chips have a border. */
    appearance?: 'outline' | 'filled' | 'inverse';
    testID?: string;
};

/** Toggle, filter and removable chips. Selected chips expose `selected` to screen readers. */
export function Chip({ label, selected = false, onPress, onRemove, icon, appearance = 'outline', testID }: ChipProps) {
    const theme = useTheme();
    const { t } = useLanguage();
    const { branding } = useBranding();
    const colors = selected
        ? appearance === 'inverse'
            ? { bg: theme.textPrimary.val, fg: theme.background.val, border: theme.textPrimary.val }
            : branding.components.chip.selected === 'filled'
              ? { bg: theme.primary.val, fg: theme.primaryText.val, border: theme.primary.val }
              : { bg: theme.primarySoft.val, fg: theme.primaryForeground.val, border: theme.primaryForeground.val }
        : appearance === 'filled' || appearance === 'inverse'
          ? { bg: theme.surface.val, fg: theme.textPrimary.val, border: theme.surface.val }
          : { bg: theme.background.val, fg: theme.textPrimary.val, border: theme.borderColor.val };
    const press = onRemove ?? onPress;

    return (
        <Pressable
            onPress={press}
            accessibilityRole='button'
            accessibilityLabel={onRemove ? t('UI.removeFilter', { name: label }) : label}
            accessibilityState={onRemove ? undefined : { selected }}
            hitSlop={(HIT_SIZE - 36) / 2}
            testID={testID}
            style={({ pressed }) => ({
                height: 36,
                paddingLeft: 14,
                paddingRight: onRemove ? 10 : 14,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.bg,
                justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
            })}
        >
            <XStack alignItems='center' gap={6}>
                {icon && <FontAwesomeIcon icon={icon} size={13} color={colors.fg} />}
                <UIText variant='captionStrong' style={{ color: colors.fg }} numberOfLines={1}>
                    {label}
                </UIText>
                {onRemove && <FontAwesomeIcon icon={faXmark} size={13} color={colors.fg} />}
            </XStack>
        </Pressable>
    );
}
