import React from 'react';
import { ActivityIndicator, Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { XStack, useTheme } from 'tamagui';
import { UIText } from './Text';
import { HIT_SIZE, radius } from './tokens';

export type ButtonVariant = 'solid' | 'outline' | 'soft' | 'ghost' | 'destructive' | 'inverse';
export type ButtonSize = 'sm' | 'md' | 'lg';

const HEIGHTS: Record<ButtonSize, number> = { sm: 36, md: 48, lg: 54 };
const FONT: Record<ButtonSize, 'captionStrong' | 'bodyStrong' | 'subheading'> = { sm: 'captionStrong', md: 'bodyStrong', lg: 'subheading' };

export type ButtonProps = {
    children?: React.ReactNode;
    onPress?: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: IconDefinition;
    /** Shown at the trailing edge, e.g. a price on "Add to cart · S$68.00". */
    trailing?: React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    testID?: string;
};

/**
 * The button used across the redesigned screens. Disabled buttons stay focusable for
 * screen readers and announce themselves as disabled.
 */
export function Button({ children, onPress, variant = 'solid', size = 'md', icon, trailing, disabled = false, loading = false, fullWidth = false, accessibilityLabel, accessibilityHint, testID }: ButtonProps) {
    const theme = useTheme();
    const inactive = disabled || loading;

    const palette = {
        solid: { bg: theme.primary.val, fg: theme.primaryText.val, border: theme.primary.val },
        inverse: { bg: theme.textPrimary.val, fg: theme.background.val, border: theme.textPrimary.val },
        outline: { bg: theme.background.val, fg: theme.textPrimary.val, border: theme.borderColor.val },
        soft: { bg: theme.primarySoft.val, fg: theme.primaryForeground.val, border: theme.primarySoft.val },
        ghost: { bg: 'transparent', fg: theme.primaryForeground.val, border: 'transparent' },
        destructive: { bg: theme.error.val, fg: '#ffffff', border: theme.error.val },
    }[variant];
    const colors = inactive && variant !== 'ghost' ? { bg: theme.surface2.val, fg: theme.textSecondary.val, border: theme.surface2.val } : palette;

    return (
        <Pressable
            onPress={inactive ? undefined : onPress}
            accessibilityRole='button'
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled: inactive, busy: loading }}
            hitSlop={HEIGHTS[size] < HIT_SIZE ? (HIT_SIZE - HEIGHTS[size]) / 2 : undefined}
            testID={testID}
            style={({ pressed }) => ({
                height: HEIGHTS[size],
                alignSelf: fullWidth ? 'stretch' : 'auto',
                minWidth: HEIGHTS[size],
                paddingHorizontal: size === 'sm' ? 14 : 18,
                borderRadius: radius.button,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.bg,
                justifyContent: 'center',
                opacity: pressed && !inactive ? 0.85 : 1,
            })}
        >
            <XStack alignItems='center' justifyContent={trailing ? 'space-between' : 'center'} gap={8}>
                <XStack alignItems='center' gap={8}>
                    {loading ? <ActivityIndicator size='small' color={colors.fg} /> : icon ? <FontAwesomeIcon icon={icon} size={size === 'sm' ? 14 : 16} color={colors.fg} /> : null}
                    {children !== undefined && (
                        <UIText variant={FONT[size]} style={{ color: colors.fg }} numberOfLines={1}>
                            {children}
                        </UIText>
                    )}
                </XStack>
                {trailing !== undefined && (
                    <UIText variant={FONT[size]} style={{ color: colors.fg }}>
                        {trailing}
                    </UIText>
                )}
            </XStack>
        </Pressable>
    );
}

export type IconButtonProps = {
    icon: IconDefinition;
    onPress?: () => void;
    accessibilityLabel: string;
    variant?: 'surface' | 'floating' | 'plain' | 'solid';
    size?: number;
    badge?: number | string | null;
    disabled?: boolean;
    testID?: string;
};

/** A round icon button with a 44pt minimum touch target and an optional count badge. */
export function IconButton({ icon, onPress, accessibilityLabel, variant = 'surface', size = 40, badge, disabled = false, testID }: IconButtonProps) {
    const theme = useTheme();
    const bg = { surface: theme.surface.val, floating: theme.background.val, plain: 'transparent', solid: theme.primary.val }[variant];
    const fg = variant === 'solid' ? theme.primaryText.val : theme.textPrimary.val;

    return (
        <Pressable
            onPress={disabled ? undefined : onPress}
            accessibilityRole='button'
            accessibilityLabel={badge ? `${accessibilityLabel}, ${badge}` : accessibilityLabel}
            accessibilityState={{ disabled }}
            hitSlop={size < HIT_SIZE ? (HIT_SIZE - size) / 2 : undefined}
            testID={testID}
            style={({ pressed }) => ({
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: bg,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
                ...(variant === 'floating'
                    ? { shadowColor: '#101828', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }
                    : null),
            })}
        >
            <FontAwesomeIcon icon={icon} size={Math.round(size * 0.45)} color={fg} />
            {badge !== undefined && badge !== null && badge !== 0 && (
                <XStack
                    position='absolute'
                    top={-2}
                    right={-2}
                    minWidth={18}
                    height={18}
                    paddingHorizontal={5}
                    borderRadius={9}
                    backgroundColor='$error'
                    alignItems='center'
                    justifyContent='center'
                    borderWidth={2}
                    borderColor='$background'
                >
                    <UIText variant='label' style={{ color: '#ffffff', fontSize: 10, lineHeight: 12, letterSpacing: 0 }}>
                        {String(badge)}
                    </UIText>
                </XStack>
            )}
        </Pressable>
    );
}
