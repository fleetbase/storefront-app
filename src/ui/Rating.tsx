import React from 'react';
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
            <FontAwesomeIcon icon={faStar} size={size} color={theme.warning.val} />
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
                <FontAwesomeIcon key={star} icon={faStar} size={size} color={star <= Math.round(value) ? theme.warning.val : theme.borderColorWithShadow.val} />
            ))}
        </XStack>
    );
}
