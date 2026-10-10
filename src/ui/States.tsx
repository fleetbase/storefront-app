import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleExclamation, faWifi } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useIsOffline from '../hooks/use-is-offline';
import { Button } from './Button';
import { UIText } from './Text';
import { elevation, radius } from './tokens';

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

/**
 * The offline notice that floats at the top of a screen while the device is offline, so
 * the customer knows why things aren't updating. Mounted once in the app layout and in
 * screens shown as modals (which sit above it).
 */
export function OfflineNotice({ top }: { top?: number }) {
    const offline = useIsOffline();
    const insets = useSafeAreaInsets();
    if (!offline) return null;
    return (
        <YStack position='absolute' top={top ?? insets.top + 6} left={12} right={12} zIndex={2000} pointerEvents='none' borderRadius={radius.card} overflow='hidden' style={elevation.floating}>
            <OfflineBanner />
        </YStack>
    );
}
