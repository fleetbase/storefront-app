import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBell, faChevronLeft, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useCustomerRequest from '../../hooks/use-customer-request';
import { DEFAULT_PREFERENCES, fetchPreferences, updatePreferences, type Preferences } from '../../commerce/notifications';
import { toast } from '../../utils/toast';
import { Button, Card, EmptyState, ErrorState, IconButton, Skeleton, UIText, elevation, radius, space } from '../../ui';

const KEYS: (keyof Preferences)[] = ['order_updates', 'promotions'];

/** Whether the OS lets this app show push notifications; null when it can't be told (web). */
async function systemPushEnabled(): Promise<boolean | null> {
    if (Platform.OS === 'web') return null;
    try {
        const { Notifications } = require('react-native-notifications');
        if (Platform.OS === 'ios') {
            const permissions = await Notifications.ios.checkPermissions();
            return !!(permissions?.alert || permissions?.badge || permissions?.sound);
        }
        return await Notifications.isRegisteredForRemoteNotifications();
    } catch {
        return null;
    }
}

/**
 * Which notifications the customer wants (order and booking updates, offers and news),
 * stored on their account, plus a warning with a way to fix it when the phone has push
 * notifications turned off for the app.
 */
const NotificationSettingsScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t } = useLanguage();
    const { customer } = useAuth();
    const { mode, ownerInfo } = useStorefrontRuntime();
    const request = useCustomerRequest();
    const [preferences, setPreferences] = useState<Preferences | null>(null);
    const [error, setError] = useState(false);
    const [saving, setSaving] = useState<keyof Preferences | null>(null);
    const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);

    const load = useCallback(() => {
        if (!customer) return;
        setError(false);
        fetchPreferences(request)
            .then(setPreferences)
            .catch(() => setError(true));
    }, [customer, request]);

    useEffect(() => {
        load();
    }, [load]);

    // Re-check after the customer comes back from the phone's settings.
    useEffect(() => {
        systemPushEnabled().then(setPushEnabled);
        const subscription = AppState.addEventListener('change', (state) => state === 'active' && systemPushEnabled().then(setPushEnabled));
        return () => subscription.remove();
    }, []);

    const toggle = async (key: keyof Preferences) => {
        if (!preferences || saving) return;
        const next = !preferences[key];
        setPreferences({ ...preferences, [key]: next });
        setSaving(key);
        try {
            setPreferences(await updatePreferences(request, { [key]: next }));
        } catch {
            setPreferences((current) => (current ? { ...current, [key]: !next } : current));
            toast.error(t('Notifications.updateFailed'));
        } finally {
            setSaving(null);
        }
    };

    const describe: Record<keyof Preferences, { title: string; body: string }> = {
        order_updates: { title: t('Notifications.prefs.orderUpdates'), body: t('Notifications.prefs.orderUpdatesBody') },
        promotions: { title: t('Notifications.prefs.promotions'), body: t('Notifications.prefs.promotionsBody', { name: ownerInfo?.name ?? '' }) },
    };

    return (
        <YStack flex={1} backgroundColor='$surface'>
            <XStack alignItems='center' gap={8} paddingHorizontal={8} paddingTop={insets.top + 4} paddingBottom={12}>
                <IconButton icon={faChevronLeft} variant='plain' size={44} accessibilityLabel={t('UI.back')} onPress={() => navigation.goBack()} />
                <UIText variant='heading' accessibilityRole='header'>
                    {t('Notifications.settingsTitle')}
                </UIText>
            </XStack>

            {!customer ? (
                <EmptyState
                    icon={faBell}
                    title={t('Notifications.signInTitle')}
                    description={t('Notifications.signInBody')}
                    actionLabel={t('Checkout.signIn')}
                    onAction={() => navigation.navigate(mode === 'network' ? 'NetworkProfileTab' : 'StoreProfileTab', { screen: 'Login' })}
                />
            ) : error ? (
                <ErrorState title={t('Notifications.loadFailed')} onRetry={load} />
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: insets.bottom + 40, gap: 14 }}
                >
                    {pushEnabled === false && (
                        <YStack gap={10} padding={14} borderRadius={radius.card} backgroundColor='$warningSoft' accessibilityRole='alert'>
                            <XStack gap={10}>
                                <FontAwesomeIcon icon={faTriangleExclamation} size={18} color={theme.warningForeground.val} />
                                <UIText flex={1} variant='caption' style={{ fontSize: 14, lineHeight: 20 }}>
                                    <UIText variant='captionStrong' style={{ fontSize: 14 }}>
                                        {t('Notifications.pushOffTitle')}{' '}
                                    </UIText>
                                    {t('Notifications.pushOffBody')}
                                </UIText>
                            </XStack>
                            <XStack>
                                <Button variant='inverse' size='sm' onPress={() => Linking.openSettings().catch(() => {})}>
                                    {t('Notifications.openSettings')}
                                </Button>
                            </XStack>
                        </YStack>
                    )}

                    <Card paddingHorizontal={14} style={elevation.card}>
                        {KEYS.map((key, index) => (
                            <XStack key={key} alignItems='center' gap={12} paddingVertical={14} borderBottomWidth={index < KEYS.length - 1 ? 1 : 0} borderColor='$borderColor'>
                                <YStack flex={1} gap={3}>
                                    <UIText variant='bodyStrong'>{describe[key].title}</UIText>
                                    <UIText variant='caption' tone='secondary'>
                                        {describe[key].body}
                                    </UIText>
                                </YStack>
                                {preferences ? (
                                    <Switch value={preferences[key] ?? DEFAULT_PREFERENCES[key]} onChange={() => toggle(key)} label={describe[key].title} disabled={saving === key} />
                                ) : (
                                    <Skeleton width={52} height={32} radius={16} />
                                )}
                            </XStack>
                        ))}
                    </Card>
                    <UIText variant='caption' tone='secondary' style={{ marginHorizontal: 4 }}>
                        {t('Notifications.prefsNote')}
                    </UIText>
                </ScrollView>
            )}
        </YStack>
    );
};

/** An accessible on/off switch drawn on the theme. */
function Switch({ value, onChange, label, disabled }: { value: boolean; onChange: () => void; label: string; disabled?: boolean }) {
    const theme = useTheme();
    return (
        <Pressable
            onPress={onChange}
            disabled={disabled}
            accessibilityRole='switch'
            accessibilityLabel={label}
            accessibilityState={{ checked: value, disabled }}
            hitSlop={6}
            style={{
                width: 52,
                height: 32,
                borderRadius: 16,
                backgroundColor: value ? theme.primary.val : theme.borderColorWithShadow.val,
                justifyContent: 'center',
                opacity: disabled ? 0.7 : 1,
            }}
        >
            <YStack width={26} height={26} borderRadius={13} backgroundColor='#ffffff' marginLeft={value ? 23 : 3} style={elevation.card} />
        </Pressable>
    );
}

export default NotificationSettingsScreen;
