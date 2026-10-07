import React from 'react';
import { Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLocationDot, faPlus } from '@fortawesome/free-solid-svg-icons';
import { YStack, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { Sheet } from './Sheet';
import { UIText } from './Text';

/** The customer's saved places, with the current one checked and "Add a new address". */
export function LocationSheet({ open, onClose, savedLocations, currentId, onSelect, onAdd }: { open: boolean; onClose: () => void; savedLocations: any; currentId?: string; onSelect: (place: any) => void; onAdd: () => void }) {
    const { t } = useLanguage();
    const theme = useTheme();
    const places = Array.from(savedLocations || []) as any[];

    return (
        <Sheet open={open} onClose={onClose} title={t('Network.chooseLocation')}>
            <YStack>
                {places.map((place) => {
                    const selected = place.id === currentId;
                    return (
                        <Pressable key={place.id} onPress={() => onSelect(place)} accessibilityRole='radio' accessibilityState={{ selected }} style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: theme.borderColor.val }}>
                            <FontAwesomeIcon icon={faLocationDot} size={16} color={selected ? theme.primaryForeground.val : theme.textSecondary.val} />
                            <YStack flex={1}>
                                <UIText variant='bodyStrong'>{place.getAttribute('name') || place.getAttribute('street1')}</UIText>
                                <UIText variant='caption' tone='secondary' numberOfLines={1}>
                                    {[place.getAttribute('street1'), place.getAttribute('city')].filter(Boolean).join(', ')}
                                </UIText>
                            </YStack>
                        </Pressable>
                    );
                })}
                <Pressable onPress={onAdd} accessibilityRole='button' style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <FontAwesomeIcon icon={faPlus} size={16} color={theme.primaryForeground.val} />
                    <UIText variant='bodyStrong' tone='brand'>
                        {t('Network.addAddress')}
                    </UIText>
                </Pressable>
            </YStack>
        </Sheet>
    );
}
