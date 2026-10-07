import React from 'react';
import { Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMinus, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { XStack, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { UIText } from './Text';
import { radius } from './tokens';

export type StepperProps = {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    /** At the minimum, the minus button removes the item instead (shown as a bin). */
    onRemove?: () => void;
    itemName?: string;
    size?: 'sm' | 'md';
};

/** A quantity stepper. With `onRemove`, decreasing from the minimum removes the line. */
export function Stepper({ value, onChange, min = 1, max = 99, onRemove, itemName, size = 'md' }: StepperProps) {
    const theme = useTheme();
    const { t } = useLanguage();
    const height = size === 'sm' ? 36 : 52;
    const atMin = value <= min;
    const removes = atMin && !!onRemove;

    const button = (icon: typeof faPlus, label: string, onPress: () => void, disabled: boolean, color = theme.textPrimary.val) => (
        <Pressable
            onPress={disabled ? undefined : onPress}
            accessibilityRole='button'
            accessibilityLabel={label}
            accessibilityState={{ disabled }}
            hitSlop={size === 'sm' ? 4 : 0}
            style={{ width: size === 'sm' ? 36 : 48, height, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}
        >
            <FontAwesomeIcon icon={icon} size={size === 'sm' ? 13 : 16} color={color} />
        </Pressable>
    );

    return (
        <XStack
            accessibilityRole='adjustable'
            accessibilityValue={{ now: value, min, max }}
            alignItems='center'
            height={height}
            borderRadius={size === 'sm' ? radius.pill : radius.button}
            borderWidth={size === 'sm' ? 1 : 0}
            borderColor='$borderColor'
            backgroundColor={size === 'sm' ? '$background' : '$surface'}
        >
            {removes
                ? button(faTrashCan, itemName ? t('UI.removeItem', { name: itemName }) : t('UI.remove'), onRemove!, false, theme.errorForeground.val)
                : button(faMinus, t('UI.decreaseQuantity'), () => onChange(Math.max(min, value - 1)), atMin)}
            <UIText variant='bodyStrong' minWidth={22} textAlign='center' aria-live='polite'>
                {value}
            </UIText>
            {button(faPlus, t('UI.increaseQuantity'), () => onChange(Math.min(max, value + 1)), value >= max)}
        </XStack>
    );
}

export type SegmentOption<T extends string> = { value: T; label: string };

/** Two to four mutually exclusive options, e.g. Delivery / Pickup. */
export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel }: { options: SegmentOption<T>[]; value: T; onChange: (value: T) => void; accessibilityLabel: string }) {
    const theme = useTheme();
    return (
        <XStack accessibilityRole='tablist' accessibilityLabel={accessibilityLabel} padding={4} gap={4} borderRadius={radius.button} backgroundColor='$surface2'>
            {options.map((option) => {
                const selected = option.value === value;
                return (
                    <Pressable
                        key={option.value}
                        onPress={() => onChange(option.value)}
                        accessibilityRole='tab'
                        accessibilityState={{ selected }}
                        style={{
                            flex: 1,
                            height: 40,
                            borderRadius: radius.button - 4,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: selected ? theme.background.val : 'transparent',
                            ...(selected ? { shadowColor: '#101828', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null),
                        }}
                    >
                        <UIText variant='captionStrong' tone={selected ? 'primary' : 'secondary'}>
                            {option.label}
                        </UIText>
                    </Pressable>
                );
            })}
        </XStack>
    );
}
