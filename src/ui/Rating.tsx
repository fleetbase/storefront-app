import React from 'react';
import { Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';
import { XStack, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { UIText } from './Text';

/** "★ 4.8 (264)" with an accessible label. */
export function RatingLine({ rating, count, size = 13 }: { rating: number | null; count?: number | null; size?: number }) {
    const theme = useTheme();
    const { t } = useLanguage();
    if (rating === null) return null;
    return (
        <XStack alignItems='center' gap={4} accessible accessibilityLabel={t('UI.ratingLabel', { rating })}>
            <FontAwesomeIcon icon={faStar} size={size} color={theme.warningForeground.val} />
            <UIText variant='captionStrong'>{rating.toFixed(1)}</UIText>
            {count !== undefined && count !== null && (
                <UIText variant='caption' tone='secondary'>
                    ({count})
                </UIText>
            )}
        </XStack>
    );
}

/** Five stars, filled up to `value`. Display only; the review form has its own input. */
export function Stars({ value, size = 13 }: { value: number; size?: number }) {
    const theme = useTheme();
    const { t } = useLanguage();
    return (
        <XStack gap={2} accessible accessibilityLabel={t('UI.ratingLabel', { rating: value })}>
            {[1, 2, 3, 4, 5].map((star) => (
                <FontAwesomeIcon key={star} icon={faStar} size={size} color={star <= Math.round(value) ? theme.warningForeground.val : theme.borderColorWithShadow.val} />
            ))}
        </XStack>
    );
}

/** Five tappable stars, a radio group for a 1–5 rating. */
export function StarInput({ value, onChange, size = 40, label }: { value: number; onChange: (rating: number) => void; size?: number; label: string }) {
    const theme = useTheme();
    const { t } = useLanguage();
    return (
        <XStack gap={size > 30 ? 6 : 0} accessibilityRole='radiogroup' accessibilityLabel={label}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                    key={star}
                    onPress={() => onChange(star)}
                    accessibilityRole='radio'
                    accessibilityState={{ checked: value === star }}
                    accessibilityLabel={t('UI.starsCount', { count: star })}
                    hitSlop={4}
                    style={{ width: Math.max(44, size + 8), height: Math.max(44, size + 8), alignItems: 'center', justifyContent: 'center' }}
                >
                    <FontAwesomeIcon icon={faStar} size={size} color={star <= value ? theme.warningForeground.val : theme.borderColorWithShadow.val} />
                </Pressable>
            ))}
        </XStack>
    );
}
