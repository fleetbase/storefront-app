import React, { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLocationArrow, faMagnifyingGlass, faPen } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { getLiveLocation } from '../utils/location';
import { handleNavigateNewLocation } from '../utils';
import { toast } from '../utils/toast';
import { placeKey, placeLines, sortPlaces } from '../commerce/places';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { UIText } from './Text';
import { radius } from './tokens';

export type LocationSheetProps = {
    open: boolean;
    onClose: () => void;
    savedLocations: any;
    /** The place deliveries go to now; it is the default and starts selected. */
    current?: any;
    onSelect: (place: any) => void;
    /** Overrides "Search for a new address"; by default it opens the address search. */
    onAdd?: () => void;
    /** A line under the confirm button, e.g. that checkout re-quotes delivery. */
    note?: string;
};

/**
 * "Deliver to": search for a new address, use where the customer is now, or pick one
 * of their saved places (the current one first, marked Default) and confirm it.
 * Addresses added from here become the delivery address.
 */
export function LocationSheet({ open, onClose, savedLocations, current, onSelect, onAdd, note }: LocationSheetProps) {
    const { t } = useLanguage();
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const currentKey = placeKey(current);
    const places = sortPlaces(Array.from(savedLocations || []) as any[], current);
    const [selectedKey, setSelectedKey] = useState<string | null>(currentKey);
    const [locating, setLocating] = useState(false);
    const selected = places.find((place) => placeKey(place) === selectedKey) ?? null;

    // Each opening starts from the address in use.
    useEffect(() => {
        if (open) setSelectedKey(currentKey);
    }, [open, currentKey]);

    const search = () => {
        onClose();
        if (onAdd) onAdd();
        else handleNavigateNewLocation(navigation, { makeDefault: true });
    };

    const useCurrentLocation = async () => {
        setLocating(true);
        try {
            const place = await getLiveLocation();
            if (!place) throw new Error('no location');
            onClose();
            navigation.navigate('EditLocation', { place: place.serialize(), makeDefault: true });
        } catch {
            toast.error(t('Places.locationUnavailable'));
        } finally {
            setLocating(false);
        }
    };

    const edit = (place: any) => {
        onClose();
        navigation.navigate('EditLocation', { place: place.serialize() });
    };

    const manage = () => {
        onClose();
        navigation.navigate('AddressBook');
    };

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title={t('Places.sheetTitle')}
            footer={
                selected ? (
                    <YStack gap={10}>
                        <Button fullWidth size='lg' onPress={() => onSelect(selected)}>
                            {t('Places.deliverTo', { name: placeLines(selected).title })}
                        </Button>
                        {note ? (
                            <UIText variant='caption' tone='secondary' textAlign='center'>
                                {note}
                            </UIText>
                        ) : null}
                    </YStack>
                ) : undefined
            }
        >
            <YStack gap={4}>
                <Pressable
                    onPress={search}
                    accessibilityRole='button'
                    style={{ height: 48, borderRadius: radius.button, backgroundColor: theme.surface.val, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}
                >
                    <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color={theme.textSecondary.val} />
                    <UIText tone='secondary'>{t('Places.searchNew')}</UIText>
                </Pressable>

                <Pressable
                    onPress={useCurrentLocation}
                    disabled={locating}
                    accessibilityRole='button'
                    style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: locating ? 0.6 : 1 }}
                >
                    <YStack width={40} height={40} borderRadius={20} backgroundColor='$primarySoft' alignItems='center' justifyContent='center'>
                        <FontAwesomeIcon icon={faLocationArrow} size={16} color={theme.primaryForeground.val} />
                    </YStack>
                    <UIText variant='bodyStrong' tone='brand' flex={1}>
                        {locating ? t('Places.locating') : t('Places.useCurrentLocation')}
                    </UIText>
                </Pressable>

                {places.length > 0 && (
                    <XStack alignItems='center' justifyContent='space-between' marginTop={6}>
                        <UIText variant='label' tone='secondary'>
                            {t('Places.savedPlaces')}
                        </UIText>
                        <Pressable onPress={manage} accessibilityRole='button' hitSlop={10} style={{ minHeight: 40, justifyContent: 'center' }}>
                            <UIText variant='captionStrong' tone='brand' style={{ fontSize: 14 }}>
                                {t('Places.manage')}
                            </UIText>
                        </Pressable>
                    </XStack>
                )}

                <YStack accessibilityRole='radiogroup'>
                    {places.map((place) => {
                        const { title, address } = placeLines(place);
                        const key = placeKey(place);
                        const checked = key === selectedKey;
                        return (
                            <XStack key={key} alignItems='center' borderBottomWidth={1} borderColor='$borderColor'>
                                <Pressable
                                    onPress={() => setSelectedKey(key)}
                                    accessibilityRole='radio'
                                    accessibilityState={{ checked }}
                                    accessibilityLabel={`${title}, ${address}`}
                                    style={{ flex: 1, minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 }}
                                >
                                    <YStack
                                        width={22}
                                        height={22}
                                        borderRadius={11}
                                        borderWidth={2}
                                        borderColor={checked ? '$primary' : '$borderColorWithShadow'}
                                        alignItems='center'
                                        justifyContent='center'
                                    >
                                        {checked && <YStack width={10} height={10} borderRadius={5} backgroundColor='$primary' />}
                                    </YStack>
                                    <YStack flex={1} gap={2}>
                                        <XStack alignItems='center' gap={8}>
                                            <UIText variant='bodyStrong' numberOfLines={1} flexShrink={1}>
                                                {title}
                                            </UIText>
                                            {key === currentKey && (
                                                <YStack paddingHorizontal={8} paddingVertical={2} borderRadius={radius.pill} backgroundColor='$surface2'>
                                                    <UIText variant='captionStrong' tone='secondary' style={{ fontSize: 11 }}>
                                                        {t('Places.default')}
                                                    </UIText>
                                                </YStack>
                                            )}
                                        </XStack>
                                        {address ? (
                                            <UIText variant='caption' tone='secondary' numberOfLines={2}>
                                                {address}
                                            </UIText>
                                        ) : null}
                                    </YStack>
                                </Pressable>
                                {/* A guest's places live on this device only and can't be edited. */}
                                {place.id ? (
                                    <Pressable
                                        onPress={() => edit(place)}
                                        accessibilityRole='button'
                                        accessibilityLabel={t('Places.editPlace', { name: title })}
                                        style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <FontAwesomeIcon icon={faPen} size={15} color={theme.textSecondary.val} />
                                    </Pressable>
                                ) : null}
                            </XStack>
                        );
                    })}
                </YStack>
            </YStack>
        </Sheet>
    );
}
