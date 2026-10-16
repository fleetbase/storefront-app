import React, { useCallback, useState } from 'react';
import { Linking, Platform, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { request, PERMISSIONS, RESULTS, check } from 'react-native-permissions';
import { faLocationArrow, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { YStack } from 'tamagui';
import { requestWebGeolocationPermission } from '../utils/location';
import { handleNavigateNewLocation } from '../utils';
import { useLanguage } from '../contexts/LanguageContext';
import { Button, UIText, elevation, space } from '../ui';

const PERMISSION = Platform.OS === 'ios' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

/**
 * Ask for location to show what delivers nearby, or let the customer type an address
 * instead. When the OS has location turned off for the app, say so and offer Settings.
 * Opened from inside the app (not at boot), it can be skipped.
 */
const LocationPermissionScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const [denied, setDenied] = useState(false);
    const [asking, setAsking] = useState(false);
    const state = navigation.getState?.();
    const previous = state?.routes?.[(state?.index ?? 0) - 1];
    const openedInApp = !!previous && previous.name !== 'Boot';

    // Return to the screen that asked, or restart boot when boot sent us here.
    const continueGranted = useCallback(() => {
        if (openedInApp) {
            navigation.goBack();
            return;
        }
        navigation.reset({ index: 0, routes: [{ name: 'Boot' }] });
    }, [navigation, openedInApp]);

    const ask = async () => {
        setAsking(true);
        try {
            const granted = Platform.OS === 'web' ? await requestWebGeolocationPermission() : (await request(PERMISSION)) === RESULTS.GRANTED;
            if (granted) continueGranted();
            else setDenied(true);
        } finally {
            setAsking(false);
        }
    };

    // Back from Settings with location turned on: carry on.
    useFocusEffect(
        useCallback(() => {
            if (Platform.OS === 'web') return;
            check(PERMISSION)
                .then((result) => {
                    if (result === RESULTS.GRANTED) continueGranted();
                    else if (result === RESULTS.BLOCKED) setDenied(true);
                })
                .catch(() => {});
        }, [continueGranted])
    );

    return (
        <YStack flex={1} backgroundColor='$background'>
            <MapArt height={insets.top + 360} />

            {openedInApp && (
                <YStack position='absolute' top={insets.top + 8} right={space.gutter}>
                    <Button variant='outline' size='sm' onPress={() => navigation.goBack()}>
                        {t('Places.notNow')}
                    </Button>
                </YStack>
            )}

            <YStack flex={1} paddingHorizontal={24} paddingBottom={insets.bottom + 16} gap={14}>
                <UIText variant='title' accessibilityRole='header'>
                    {denied ? t('Places.deniedTitle') : t('Places.allowTitle')}
                </UIText>
                <UIText tone='secondary' style={{ fontSize: 16, lineHeight: 24 }}>
                    {denied ? (Platform.OS === 'web' ? t('Places.deniedBodyWeb') : t('Places.deniedBody')) : t('Places.allowBody')}
                </UIText>
                <YStack flex={1} />
                {denied ? (
                    Platform.OS !== 'web' && (
                        <Button fullWidth size='lg' onPress={() => Linking.openSettings().catch(() => {})}>
                            {t('Places.openSettings')}
                        </Button>
                    )
                ) : (
                    <Button fullWidth size='lg' icon={faLocationArrow} loading={asking} onPress={ask}>
                        {t('Places.useCurrentLocation')}
                    </Button>
                )}
                <Button fullWidth size='lg' variant='outline' icon={faMagnifyingGlass} onPress={() => handleNavigateNewLocation(navigation, { makeDefault: true })}>
                    {t('Places.enterAddress')}
                </Button>
            </YStack>
        </YStack>
    );
};

/** A quiet map drawn from theme colours with a "you are here" dot. Decorative only. */
function MapArt({ height }: { height: number }) {
    const road = { position: 'absolute' as const, backgroundColor: '$background' };
    return (
        <YStack height={height} backgroundColor='$surface' overflow='hidden' accessibilityElementsHidden importantForAccessibility='no-hide-descendants'>
            <YStack position='absolute' left={-30} bottom={20} width={220} height={160} borderRadius={80} backgroundColor='$primarySoft' />
            <YStack position='absolute' right={-30} top={height * 0.25} width={180} height={140} borderRadius={70} backgroundColor='$successSoft' />
            <YStack {...road} left={-20} right={-20} top={height * 0.5} height={12} style={{ transform: [{ rotate: '-8deg' }] }} />
            <YStack {...road} left={-20} right={-20} top={height * 0.78} height={8} style={{ transform: [{ rotate: '5deg' }] }} />
            <YStack {...road} left='44%' top={-40} bottom={-40} width={12} style={{ transform: [{ rotate: '12deg' }] }} />
            <YStack {...road} left='78%' top={-40} bottom={-40} width={8} style={{ transform: [{ rotate: '-4deg' }] }} />
            <YStack style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', top: 40 }]}>
                <YStack width={120} height={120} borderRadius={60} backgroundColor='$primarySoft' alignItems='center' justifyContent='center' opacity={0.95}>
                    <YStack width={28} height={28} borderRadius={14} backgroundColor='$primary' borderWidth={5} borderColor='$background' style={elevation.floating} />
                </YStack>
            </YStack>
        </YStack>
    );
}

export default LocationPermissionScreen;
