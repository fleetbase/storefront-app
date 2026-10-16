import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faLocationDot, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { Place, Point } from '@fleetbase/sdk';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { createFleetbasePlaceFromDetails, geocode, getCoordinates, getLocationFromRouteOrStorage, restoreFleetbasePlace } from '../utils/location';
import { movedEnough, placeLines, regionAround, type Region } from '../commerce/places';
import { PinMap, type PinMapHandle } from '../components/location/PinMap';
import { Button, IconButton, Skeleton, UIText, elevation, radius, space } from '../ui';

const STREET_DELTA = 0.004;

/**
 * Place an address by moving the map under a fixed pin. The address under the pin is
 * looked up each time the map settles. Used to add an address (then fill in its
 * details) and, with `adjust`, to move the pin of the address being edited.
 */
const LocationPickerScreen = ({ route }) => {
    const params = route.params || {};
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t } = useLanguage();
    const adjusting = !!params.adjust || route.name === 'EditLocationCoord';
    const editing = useMemo(() => (params.place ? restoreFleetbasePlace(params.place) : null), [params.place]);
    const initialRegion = useMemo(
        () => regionAround(getCoordinates(editing ?? getLocationFromRouteOrStorage('initialLocation', params)), undefined, STREET_DELTA),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );
    const map = useRef<PinMapHandle>(null);
    const [center, setCenter] = useState<Region>(initialRegion);
    const [found, setFound] = useState<any>(adjusting ? editing : null);
    const [moving, setMoving] = useState(!adjusting);
    const lookedUp = useRef<Region | null>(adjusting ? initialRegion : null);
    const latest = useRef(0);

    const lookUp = async (region: Region) => {
        setCenter(region);
        if (lookedUp.current && !movedEnough(lookedUp.current, region)) {
            setMoving(false);
            return;
        }
        lookedUp.current = region;
        const request = ++latest.current;
        setMoving(true);
        const result = await geocode(region.latitude, region.longitude).catch(() => null);
        if (request !== latest.current) return;
        setFound(result ? createFleetbasePlaceFromDetails(result) : null);
        setMoving(false);
    };

    // Look up the starting point; a map doesn't always report its first settle.
    useEffect(() => {
        if (!adjusting) lookUp(initialRegion);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // The pin's exact position, with the address found under it.
    const pinnedPlace = () => {
        const point = new Point(center.latitude, center.longitude);
        if (adjusting && editing) {
            editing.setAttribute('location', point);
            return editing;
        }
        const attributes = found ? { ...found.serialize(), id: undefined, name: null } : {};
        return new Place({ ...attributes, location: point });
    };

    const confirm = () => {
        const place = pinnedPlace().serialize();
        if (adjusting) {
            navigation.popTo('EditLocation', { place, makeDefault: params.makeDefault }, { merge: true });
            return;
        }
        navigation.navigate('EditLocation', { place, makeDefault: params.makeDefault });
    };

    const search = () => {
        const state = navigation.getState?.();
        const previous = state?.routes?.[(state?.index ?? 0) - 1];
        if (previous?.name === 'AddNewLocation') navigation.goBack();
        else navigation.navigate('AddNewLocation', { makeDefault: params.makeDefault });
    };

    const lines = found ? placeLines(found) : null;
    const address = lines ? { title: lines.title, line: lines.address } : { title: t('Places.unnamedSpot'), line: `${center.latitude.toFixed(5)}, ${center.longitude.toFixed(5)}` };

    return (
        <YStack flex={1} backgroundColor='$surface'>
            <YStack style={StyleSheet.absoluteFill} accessibilityLabel={t('Places.pinMapLabel')}>
                <PinMap ref={map} initialRegion={initialRegion} onSettle={lookUp} onMoveStart={() => setMoving(true)} locateTop={insets.top + 64} />
            </YStack>

            {!moving && (
                <YStack pointerEvents='none' style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                    <YStack marginBottom={190} paddingHorizontal={10} paddingVertical={6} borderRadius={8} backgroundColor='$textPrimary'>
                        <UIText variant='captionStrong' style={{ color: theme.background.val }}>
                            {t('Places.pinBubble')}
                        </UIText>
                    </YStack>
                </YStack>
            )}

            <XStack position='absolute' top={insets.top + 8} left={space.gutter} right={space.gutter} gap={10} alignItems='center'>
                <IconButton icon={faChevronLeft} variant='floating' size={44} accessibilityLabel={t('UI.back')} onPress={() => navigation.goBack()} />
                {!adjusting && (
                    <Pressable
                        onPress={search}
                        accessibilityRole='button'
                        style={{
                            flex: 1,
                            height: 44,
                            borderRadius: radius.pill,
                            backgroundColor: theme.background.val,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            paddingHorizontal: 14,
                            ...elevation.floating,
                        }}
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlass} size={15} color={theme.textSecondary.val} />
                        <UIText tone='secondary'>{t('Places.searchLabel')}</UIText>
                    </Pressable>
                )}
            </XStack>

            <YStack
                position='absolute'
                left={0}
                right={0}
                bottom={0}
                paddingHorizontal={space.gutter}
                paddingTop={18}
                paddingBottom={insets.bottom + 16}
                gap={14}
                backgroundColor='$background'
                borderTopLeftRadius={radius.sheet}
                borderTopRightRadius={radius.sheet}
                style={elevation.sheet}
            >
                <UIText variant='caption' tone='secondary'>
                    {t('Places.pinHint')}
                </UIText>
                <XStack gap={12} alignItems='center'>
                    <YStack width={40} height={40} borderRadius={20} backgroundColor='$primarySoft' alignItems='center' justifyContent='center'>
                        <FontAwesomeIcon icon={faLocationDot} size={17} color={theme.primaryForeground.val} />
                    </YStack>
                    {moving ? (
                        <YStack flex={1} gap={8} accessibilityLabel={t('Places.findingAddress')}>
                            <Skeleton width='70%' height={16} />
                            <Skeleton width='50%' height={12} />
                        </YStack>
                    ) : (
                        <YStack flex={1} gap={2} accessibilityLiveRegion='polite'>
                            <UIText variant='subheading' numberOfLines={1}>
                                {address.title}
                            </UIText>
                            {address.line ? (
                                <UIText variant='caption' tone='secondary' numberOfLines={1}>
                                    {address.line}
                                </UIText>
                            ) : null}
                        </YStack>
                    )}
                    <Button variant='ghost' size='sm' onPress={() => map.current?.moveTo(initialRegion)}>
                        {t('Places.reset')}
                    </Button>
                </XStack>
                <Button fullWidth size='lg' disabled={moving} onPress={confirm}>
                    {moving ? t('Places.findingAddress') : t('Places.useThisLocation')}
                </Button>
            </YStack>
        </YStack>
    );
};

export default LocationPickerScreen;
