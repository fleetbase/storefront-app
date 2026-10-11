import React from 'react';
import { Text, YStack } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import type { ScreenId } from './screen-ids';

/** Theme-aware blank surface shown for the frame(s) a screen module takes to load. */
export const ScreenLoading = () => <YStack flex={1} bg='$background' testID='screen-slot-loading' />;

export const ScreenLoadError = ({ id }: { id: ScreenId }) => {
    const { t } = useLanguage();
    return (
        <YStack flex={1} bg='$background' alignItems='center' justifyContent='center' padding='$6' testID={`screen-slot-error-${id}`}>
            <Text color='$textPrimary' textAlign='center' accessibilityRole='alert'>
                {t('ScreenSlot.loadError')}
            </Text>
        </YStack>
    );
};

export const renderScreenLoading = () => <ScreenLoading />;
export const renderScreenLoadError = (id: ScreenId) => <ScreenLoadError id={id} />;
