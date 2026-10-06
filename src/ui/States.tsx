import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleExclamation, faWifi } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './Button';
import { UIText } from './Text';

export type EmptyStateProps = {
    icon: IconDefinition;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    secondaryLabel?: string;
    onSecondary?: () => void;
};

/** A centred explanation with a next step, for empty lists and finished flows. */
export function EmptyState({ icon, title, description, actionLabel, onAction, secondaryLabel, onSecondary }: EmptyStateProps) {
    const theme = useTheme();
    return (
        <YStack alignItems='center' paddingHorizontal={32} paddingVertical={40} gap={12}>
            <YStack width={80} height={80} borderRadius={40} backgroundColor='$surface' alignItems='center' justifyContent='center' accessibilityElementsHidden>
                <FontAwesomeIcon icon={icon} size={30} color={theme.textSecondary.val} />
            </YStack>
            <UIText variant='heading' textAlign='center' accessibilityRole='header'>
                {title}
            </UIText>
            {!!description && (
                <UIText tone='secondary' textAlign='center'>
                    {description}
                </UIText>
            )}
            {!!actionLabel && (
                <YStack marginTop={8}>
                    <Button onPress={onAction}>{actionLabel}</Button>
                </YStack>
            )}
            {!!secondaryLabel && (
                <Button variant='ghost' onPress={onSecondary}>
                    {secondaryLabel}
                </Button>
            )}
        </YStack>
    );
}

/** A failed load with a retry. */
export function ErrorState({ title, description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
    const { t } = useLanguage();
    return (
        <EmptyState
            icon={faCircleExclamation}
            title={title ?? t('UI.loadErrorTitle')}
            description={description ?? t('UI.loadErrorBody')}
            actionLabel={onRetry ? t('UI.tryAgain') : undefined}
            onAction={onRetry}
        />
    );
}

/** A slim banner shown while the device is offline, with an optional retry. */
export function OfflineBanner({ onRetry }: { onRetry?: () => void }) {
    const { t } = useLanguage();
    const theme = useTheme();
    return (
        <XStack accessibilityRole='alert' alignItems='center' gap={10} paddingHorizontal={16} paddingVertical={10} backgroundColor='$textPrimary'>
            <FontAwesomeIcon icon={faWifi} size={14} color={theme.background.val} />
            <UIText variant='captionStrong' flex={1} style={{ color: theme.background.val }}>
                {t('UI.offlineBanner')}
            </UIText>
            {onRetry && (
                <UIText variant='captionStrong' onPress={onRetry} accessibilityRole='button' style={{ color: theme.background.val, textDecorationLine: 'underline' }}>
                    {t('UI.tryAgain')}
                </UIText>
            )}
        </XStack>
    );
}
