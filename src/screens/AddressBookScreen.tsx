import React, { useState } from 'react';
import { FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBuilding, faBuildingUser, faChevronLeft, faHospital, faHotel, faHouse, faLocationDot, faPlus, faSchool } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { handleNavigateNewLocation } from '../utils';
import { toast } from '../utils/toast';
import { placeFields, placeKey, placeLines, sortPlaces } from '../commerce/places';
import useCurrentLocation from '../hooks/use-current-location';
import useSavedLocations from '../hooks/use-saved-locations';
import { Button, Card, EmptyState, IconButton, Skeleton, UIText, elevation, radius, space } from '../ui';

const TYPE_ICONS = { apartment: faBuildingUser, house: faHouse, office: faBuilding, hotel: faHotel, hospital: faHospital, school: faSchool };

/** The customer's saved places, the default first and marked, each with Edit and "Set as default". */
const AddressBookScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t } = useLanguage();
    const { currentLocation, updateDefaultLocationPromise } = useCurrentLocation();
    const { savedLocations, isLoadingSavedLocations } = useSavedLocations();
    const [defaulting, setDefaulting] = useState<string | null>(null);
    const defaultKey = placeKey(currentLocation);
    const places = sortPlaces(Array.from(savedLocations || []) as any[], currentLocation);

    const makeDefault = async (place: any) => {
        setDefaulting(placeKey(place));
        try {
            await updateDefaultLocationPromise(place);
            toast.success(t('Places.defaultUpdated', { name: placeLines(place).title }));
        } catch {
            toast.error(t('Places.saveFailed'));
        } finally {
            setDefaulting(null);
        }
    };

    const renderPlace = ({ item: place }: { item: any }) => {
        const { title, address } = placeLines(place);
        const { instructions, type } = placeFields(place);
        const isDefault = placeKey(place) === defaultKey;
        return (
            <Card padding={14} gap={10} borderWidth={2} borderColor={isDefault ? '$primary' : 'transparent'} style={elevation.card}>
                <XStack gap={12} alignItems='flex-start'>
                    <YStack width={40} height={40} borderRadius={radius.tile} backgroundColor={isDefault ? '$primarySoft' : '$surface'} alignItems='center' justifyContent='center'>
                        <FontAwesomeIcon
                            icon={TYPE_ICONS[type as keyof typeof TYPE_ICONS] ?? faLocationDot}
                            size={17}
                            color={isDefault ? theme.primaryForeground.val : theme.textSecondary.val}
                        />
                    </YStack>
                    <YStack flex={1} gap={3}>
                        <XStack alignItems='center' gap={8}>
                            <UIText variant='subheading' numberOfLines={1} flexShrink={1}>
                                {title}
                            </UIText>
                            {isDefault && (
                                <YStack paddingHorizontal={8} paddingVertical={2} borderRadius={radius.pill} backgroundColor='$primarySoft'>
                                    <UIText variant='captionStrong' tone='brand' style={{ fontSize: 11 }}>
                                        {t('Places.default')}
                                    </UIText>
                                </YStack>
                            )}
                        </XStack>
                        {address ? (
                            <UIText variant='caption' tone='secondary'>
                                {address}
                            </UIText>
                        ) : null}
                        {instructions ? (
                            <UIText variant='caption' tone='secondary' numberOfLines={2}>
                                “{instructions}”
                            </UIText>
                        ) : null}
                    </YStack>
                </XStack>
                <XStack gap={8} paddingTop={10} borderTopWidth={1} borderColor='$borderColor'>
                    <YStack flex={1}>
                        <Button variant='outline' size='sm' fullWidth onPress={() => navigation.navigate('EditLocation', { place: place.serialize() })}>
                            {t('Places.edit')}
                        </Button>
                    </YStack>
                    {!isDefault && (
                        <YStack flex={1}>
                            <Button variant='soft' size='sm' fullWidth loading={defaulting === placeKey(place)} disabled={defaulting !== null} onPress={() => makeDefault(place)}>
                                {t('Places.setDefault')}
                            </Button>
                        </YStack>
                    )}
                </XStack>
            </Card>
        );
    };

    return (
        <YStack flex={1} backgroundColor='$surface'>
            <XStack alignItems='center' gap={8} paddingHorizontal={8} paddingTop={insets.top + 4} paddingBottom={12}>
                <IconButton icon={faChevronLeft} variant='plain' size={44} accessibilityLabel={t('UI.back')} onPress={() => navigation.goBack()} />
                <UIText variant='heading' accessibilityRole='header'>
                    {t('Places.bookTitle')}
                </UIText>
            </XStack>

            <FlatList
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                data={places}
                keyExtractor={(place, index) => placeKey(place) ?? String(index)}
                renderItem={renderPlace}
                contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 24, gap: 10, flexGrow: 1 }}
                ListEmptyComponent={
                    isLoadingSavedLocations ? (
                        <YStack gap={10}>
                            {[0, 1].map((index) => (
                                <Skeleton key={index} height={132} radius={radius.card} />
                            ))}
                        </YStack>
                    ) : (
                        <EmptyState icon={faLocationDot} title={t('Places.emptyTitle')} description={t('Places.emptyBody')} />
                    )
                }
            />

            <YStack paddingHorizontal={space.gutter} paddingTop={12} paddingBottom={insets.bottom + 12} backgroundColor='$background' borderTopWidth={1} borderColor='$borderColor'>
                <Button fullWidth size='lg' icon={faPlus} onPress={() => handleNavigateNewLocation(navigation, {})}>
                    {t('Places.add')}
                </Button>
            </YStack>
        </YStack>
    );
};

export default AddressBookScreen;
