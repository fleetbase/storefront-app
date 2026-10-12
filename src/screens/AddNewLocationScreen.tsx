import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faLocationArrow, faLocationDot, faMagnifyingGlass, faMapLocationDot, faXmark } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { createFleetbasePlaceFromDetails, formattedAddressFromPlace, geocode, geocodeAutocomplete, getCoordinates, getLiveLocation, getPlaceDetails } from '../utils/location';
import { toast } from '../utils/toast';
import { EmptyState, IconButton, Skeleton, UIText, radius, space } from '../ui';

const SEARCH_DELAY_MS = 350;
const NEARBY_COUNT = 3;

type Prediction = { place_id: string; description: string };

/** "Blk 201 Tampines St 21, Singapore 520201" → the first part bold, the rest beneath. */
function splitDescription(description: string): { title: string; line: string } {
    const [title, ...rest] = description.split(',');
    return { title: title.trim(), line: rest.join(',').trim() };
}

/**
 * Add an address by searching for it. Before typing it offers where the customer is
 * now and the addresses around them; while typing, matching addresses (the last
 * results stay up while new ones load). Anything not found can be pinned on the map.
 */
const AddNewLocationScreen = ({ route }) => {
    const params = route.params || {};
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t } = useLanguage();
    const makeDefault = params.makeDefault;
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Prediction[] | null>(null);
    const [searching, setSearching] = useState(false);
    const [here, setHere] = useState<any>(null);
    const [nearby, setNearby] = useState<any[] | null>(null);
    const [locating, setLocating] = useState(true);
    const [opening, setOpening] = useState<string | null>(null);
    const latest = useRef(0);

    // Where the customer is, and the addresses around it, for the empty search.
    useEffect(() => {
        let active = true;
        (async () => {
            const place = await getLiveLocation().catch(() => null);
            if (!active) return;
            setHere(place);
            setLocating(false);
            const [latitude, longitude] = place ? getCoordinates(place) : [];
            if (!latitude || !longitude) {
                setNearby([]);
                return;
            }
            const found = await geocode(latitude, longitude, { withAllResults: true }).catch(() => null);
            if (!active) return;
            const seen = new Set<string>();
            const places = (Array.isArray(found) ? found : [])
                .map((result) => createFleetbasePlaceFromDetails(result))
                .filter((candidate) => {
                    const key = formattedAddressFromPlace(candidate);
                    if (!key || seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            setNearby(places.slice(0, NEARBY_COUNT));
        })();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const text = query.trim();
        if (!text) {
            setResults(null);
            setSearching(false);
            return;
        }
        setSearching(true);
        const request = ++latest.current;
        const timer = setTimeout(async () => {
            const coordinates = here ? getCoordinates(here) : null;
            const found = await geocodeAutocomplete(text, coordinates).catch(() => []);
            if (request !== latest.current) return;
            setResults(found);
            setSearching(false);
        }, SEARCH_DELAY_MS);
        return () => clearTimeout(timer);
    }, [query, here]);

    const openPlace = (place: any) => navigation.navigate('EditLocation', { place: place.serialize(), makeDefault });

    const openPrediction = async (prediction: Prediction) => {
        setOpening(prediction.place_id);
        try {
            const details = await getPlaceDetails(prediction.place_id);
            if (!details) throw new Error('no details');
            openPlace(createFleetbasePlaceFromDetails(details));
        } catch {
            toast.error(t('Places.searchFailed'));
        } finally {
            setOpening(null);
        }
    };

    const useHere = () => {
        if (here) openPlace(here);
        else toast.error(t('Places.locationUnavailable'));
    };

    const typing = query.trim().length > 0;
    const hereLine = locating ? t('Places.locating') : here ? formattedAddressFromPlace(here) : t('Places.locationUnavailable');

    const header = (
        <YStack>
            <Row icon={faLocationArrow} brand title={t('Places.useCurrentLocation')} line={hereLine} onPress={useHere} disabled={locating} />
            {!typing && (
                <>
                    <UIText variant='label' tone='secondary' marginTop={16} marginBottom={4} marginHorizontal={space.gutter}>
                        {t('Places.aroundHere')}
                    </UIText>
                    {nearby === null
                        ? [0, 1, 2].map((index) => (
                              <XStack key={index} gap={14} alignItems='center' paddingHorizontal={space.gutter} minHeight={64}>
                                  <Skeleton width={40} height={40} radius={20} />
                                  <YStack flex={1} gap={8}>
                                      <Skeleton width='70%' height={14} />
                                      <Skeleton width='45%' height={12} />
                                  </YStack>
                              </XStack>
                          ))
                        : nearby.map((place, index) => {
                              const [title, ...rest] = formattedAddressFromPlace(place).split(',');
                              return <Row key={index} icon={faLocationDot} title={title.trim()} line={rest.join(',').trim()} onPress={() => openPlace(place)} />;
                          })}
                </>
            )}
        </YStack>
    );

    return (
        <YStack flex={1} backgroundColor='$background'>
            <XStack alignItems='center' gap={8} paddingHorizontal={8} paddingTop={insets.top + 4} paddingBottom={8}>
                <IconButton icon={faChevronLeft} variant='plain' size={44} accessibilityLabel={t('UI.back')} onPress={() => navigation.goBack()} />
                <UIText variant='heading' accessibilityRole='header'>
                    {t('Places.searchTitle')}
                </UIText>
            </XStack>

            <XStack
                marginHorizontal={space.gutter}
                marginBottom={8}
                height={52}
                alignItems='center'
                gap={10}
                paddingLeft={14}
                paddingRight={6}
                borderRadius={radius.button}
                borderWidth={2}
                borderColor='$primary'
            >
                <FontAwesomeIcon icon={faMagnifyingGlass} size={17} color={theme.textSecondary.val} />
                <TextInput
                    value={query}
                    onChangeText={setQuery}
                    autoFocus
                    accessibilityLabel={t('Places.searchLabel')}
                    placeholder={t('Places.searchPlaceholder')}
                    placeholderTextColor={theme.textPlaceholder.val}
                    autoCapitalize='none'
                    autoComplete='off'
                    autoCorrect={false}
                    returnKeyType='search'
                    // The field's border is the focus ring; drop the browser's own outline.
                    style={{ flex: 1, height: '100%', fontSize: 16, color: theme.textPrimary.val, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null) }}
                />
                {typing && <IconButton icon={faXmark} size={36} accessibilityLabel={t('Places.clearSearch')} onPress={() => setQuery('')} />}
            </XStack>

            <FlatList
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                data={typing ? (results ?? []) : []}
                keyExtractor={(item) => item.place_id}
                keyboardShouldPersistTaps='handled'
                keyboardDismissMode='on-drag'
                ListHeaderComponent={header}
                renderItem={({ item }) => {
                    const { title, line } = splitDescription(item.description);
                    return <Row icon={faLocationDot} title={title} line={line} onPress={() => openPrediction(item)} disabled={opening !== null} busy={opening === item.place_id} />;
                }}
                ListEmptyComponent={
                    typing && results !== null && !searching ? (
                        <EmptyState icon={faMagnifyingGlass} title={t('Places.noResultsTitle', { query: query.trim() })} description={t('Places.noResultsBody')} />
                    ) : null
                }
                contentContainerStyle={{ paddingBottom: 24 }}
            />

            <YStack paddingHorizontal={space.gutter} paddingTop={12} paddingBottom={insets.bottom + 12} borderTopWidth={1} borderColor='$borderColor'>
                <Pressable
                    onPress={() => navigation.navigate('LocationPicker', { makeDefault, initialLocation: here?.serialize?.() })}
                    accessibilityRole='button'
                    style={{ height: 50, borderRadius: radius.button, backgroundColor: theme.surface2.val, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                >
                    <FontAwesomeIcon icon={faMapLocationDot} size={17} color={theme.textPrimary.val} />
                    <UIText variant='bodyStrong'>{t('Places.setOnMap')}</UIText>
                </Pressable>
            </YStack>
        </YStack>
    );
};

/** One address in the list: a round icon, the address, and its area underneath. */
function Row({
    icon,
    title,
    line,
    onPress,
    brand = false,
    disabled = false,
    busy = false,
}: {
    icon: any;
    title: string;
    line?: string;
    onPress: () => void;
    brand?: boolean;
    disabled?: boolean;
    busy?: boolean;
}) {
    const theme = useTheme();
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityLabel={line ? `${title}, ${line}` : title}
            accessibilityState={{ disabled, busy }}
            style={({ pressed }) => ({
                minHeight: 64,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingHorizontal: space.gutter,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderColor: theme.borderColor.val,
                backgroundColor: pressed ? theme.backgroundPress?.val : 'transparent',
                opacity: busy ? 0.6 : 1,
            })}
        >
            <YStack width={40} height={40} borderRadius={20} backgroundColor={brand ? '$primarySoft' : '$surface'} alignItems='center' justifyContent='center'>
                <FontAwesomeIcon icon={icon} size={16} color={brand ? theme.primaryForeground.val : theme.textSecondary.val} />
            </YStack>
            <YStack flex={1} gap={2}>
                <UIText variant='bodyStrong' tone={brand ? 'brand' : 'primary'} numberOfLines={1}>
                    {title}
                </UIText>
                {line ? (
                    <UIText variant='caption' tone='secondary' numberOfLines={1}>
                        {line}
                    </UIText>
                ) : null}
            </YStack>
        </Pressable>
    );
}

export default AddNewLocationScreen;
