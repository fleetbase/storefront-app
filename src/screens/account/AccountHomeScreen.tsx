import React, { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faBell,
    faChevronRight,
    faCircleHalfStroke,
    faCreditCard,
    faFileLines,
    faGlobe,
    faLocationDot,
    faMobileScreen,
    faReceipt,
    faShieldHalved,
    faTag,
    faTruckFast,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { XStack, YStack, useTheme } from 'tamagui';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useAppTheme from '../../hooks/use-app-theme';
import useStorage from '../../hooks/use-storage';
import useUnreadNotifications from '../../hooks/use-unread-notifications';
import useFooterOffset from '../../hooks/use-footer-offset';
import { ORDER_PAGE_SIZE, summarizeOrder } from '../../commerce/order-summary';
import { storefrontConfig } from '../../utils';
import { toast } from '../../utils/toast';
import { Badge, Button, Card, MediaImage, Sheet, UIText, initials, radius, space, tintFor } from '../../ui';

type Row = { key: string; icon: IconDefinition; label: string; value?: string | null; badge?: number; onPress: () => void; hidden?: boolean };

const GATEWAYS_WITHOUT_SAVED_METHODS = ['qpay'];

function MenuGroup({ title, rows }: { title?: string; rows: Row[] }) {
    const theme = useTheme();
    const visible = rows.filter((row) => !row.hidden);
    if (!visible.length) return null;
    return (
        <YStack gap={8}>
            {!!title && (
                <UIText variant='captionStrong' tone='secondary' style={{ textTransform: 'uppercase', letterSpacing: 0.6 }} accessibilityRole='header'>
                    {title}
                </UIText>
            )}
            <Card appearance='outlined'>
                {visible.map((row, index) => (
                    <Pressable
                        key={row.key}
                        onPress={row.onPress}
                        accessibilityRole='button'
                        accessibilityLabel={[row.label, row.value, row.badge ? String(row.badge) : null].filter(Boolean).join(', ')}
                        style={({ pressed }) => ({
                            minHeight: 54,
                            paddingHorizontal: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 14,
                            backgroundColor: pressed ? (theme.backgroundPress?.val ?? theme.surface.val) : 'transparent',
                            borderTopWidth: index ? 1 : 0,
                            borderColor: theme.borderColor.val,
                        })}
                    >
                        <FontAwesomeIcon icon={row.icon} size={17} color={theme.textSecondary.val} />
                        <UIText variant='bodyStrong' flex={1} numberOfLines={1}>
                            {row.label}
                        </UIText>
                        {!!row.badge && <Badge label={String(row.badge)} tone='brand' size='sm' />}
                        {!!row.value && (
                            <UIText tone='secondary' numberOfLines={1}>
                                {row.value}
                            </UIText>
                        )}
                        <FontAwesomeIcon icon={faChevronRight} size={13} color={theme.textSecondary.val} />
                    </Pressable>
                ))}
            </Card>
        </YStack>
    );
}

/** Choose one option from a short list, e.g. the language or appearance. */
function ChoiceSheet({
    open,
    title,
    options,
    selected,
    onSelect,
    onClose,
}: {
    open: boolean;
    title: string;
    options: { key: string; label: string }[];
    selected: string;
    onSelect: (key: string) => void;
    onClose: () => void;
}) {
    const theme = useTheme();
    return (
        <Sheet open={open} onClose={onClose} title={title}>
            <YStack>
                {options.map((option) => (
                    <Pressable
                        key={option.key}
                        onPress={() => {
                            onSelect(option.key);
                            onClose();
                        }}
                        accessibilityRole='radio'
                        accessibilityState={{ checked: option.key === selected }}
                        style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: theme.borderColor.val }}
                    >
                        <UIText flex={1} variant={option.key === selected ? 'bodyStrong' : 'body'}>
                            {option.label}
                        </UIText>
                        <YStack width={22} height={22} borderRadius={11} borderWidth={option.key === selected ? 7 : 2} borderColor={option.key === selected ? '$primary' : '$borderColor'} />
                    </Pressable>
                ))}
            </YStack>
        </Sheet>
    );
}

/**
 * The signed-in customer's account: who they are, an active order to jump back to,
 * shortcuts to orders, offers, places, payment and notifications, preferences, and
 * signing out or deleting the account.
 */
const AccountHomeScreen = () => {
    const navigation = useNavigation<any>();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const footer = useFooterOffset(false);
    const { t, locale, setLocale, languages = [] } = useLanguage();
    const { userColorScheme, changeScheme, schemes } = useAppTheme();
    const { customer, logout, deleteAccount } = useAuth() as any;
    const { count: unread } = useUnreadNotifications();
    const { mode } = useStorefrontRuntime();
    // Offers and the inbox live in the Home tab, where their store and order links work.
    const openInHome = (screen: string) => navigation.navigate(mode === 'network' ? 'NetworkHomeTab' : 'StoreHomeTab', { screen, initial: false });
    const [, setStoredOrders] = useStorage<any[]>(`${customer?.id}_orders`, []);
    // Orders fetched when the screen is shown. The on-device cache can hold orders that no
    // longer exist (another instance, a re-seeded database), so it never decides this card.
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [sheet, setSheet] = useState<'language' | 'appearance' | 'delete' | null>(null);
    const [deleting, setDeleting] = useState(false);

    const name: string = customer?.getAttribute?.('name') ?? '';
    const email: string | null = customer?.getAttribute?.('email') ?? null;
    const phone: string | null = customer?.getAttribute?.('phone') ?? null;
    const photo: string | null = customer?.getAttribute?.('photo_url') ?? null;
    const gateway = storefrontConfig('paymentGateway');
    const terms = storefrontConfig('termsUrl');
    const privacy = storefrontConfig('privacyUrl');

    useFocusEffect(
        useCallback(() => {
            let live = true;
            customer
                ?.getOrderHistory?.({ sort: '-created_at', limit: ORDER_PAGE_SIZE })
                .then((result: any) => {
                    if (!live) return;
                    const serialized = (Array.isArray(result) ? result : Array.from(result ?? [])).map((order: any) => (typeof order?.serialize === 'function' ? order.serialize() : order));
                    setRecentOrders(serialized);
                    setStoredOrders(serialized);
                })
                .catch(() => {
                    // Leave the card hidden; the order history screen shows load errors.
                });
            return () => {
                live = false;
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [customer?.id])
    );

    // The most recent order still in progress.
    const activeOrder = useMemo(() => recentOrders.map(summarizeOrder).find((order) => order.id && order.active) ?? null, [recentOrders]);

    const languageName = languages.find((language: any) => language.code === locale)?.native ?? locale.toUpperCase();
    const schemeLabel = (scheme: string) => t(`Account.scheme.${scheme}`);

    const requestDeletion = async () => {
        setDeleting(true);
        try {
            await deleteAccount();
            setSheet(null);
            navigation.navigate('DeleteAccountVerify', { phone });
        } catch (failure: any) {
            toast.error(failure?.message || t('Auth.sendFailed'));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <YStack flex={1} backgroundColor='$background'>
            <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: footer + insets.bottom + 32, paddingHorizontal: space.gutter, gap: 22 }}>
                <UIText variant='display' style={{ fontSize: 28, lineHeight: 34 }} accessibilityRole='header'>
                    {t('Account.title')}
                </UIText>

                <XStack alignItems='center' gap={14}>
                    {photo ? (
                        <MediaImage uri={photo} seed={name} width={64} height={64} radius={32} />
                    ) : (
                        <YStack
                            width={64}
                            height={64}
                            borderRadius={32}
                            alignItems='center'
                            justifyContent='center'
                            style={{ backgroundColor: tintFor(name) }}
                            accessibilityElementsHidden
                            importantForAccessibility='no-hide-descendants'
                        >
                            <UIText variant='title' style={{ color: '#fff' }}>
                                {initials(name)}
                            </UIText>
                        </YStack>
                    )}
                    <YStack flex={1} gap={2}>
                        <UIText variant='title' numberOfLines={1}>
                            {name}
                        </UIText>
                        {!!(email || phone) && (
                            <UIText tone='secondary' numberOfLines={1}>
                                {email || phone}
                            </UIText>
                        )}
                    </YStack>
                    <Button variant='soft' size='sm' onPress={() => navigation.navigate('Account')}>
                        {t('Account.edit')}
                    </Button>
                </XStack>

                {!phone && (
                    <Card appearance='flat' padding={16} gap={12} borderRadius={radius.card}>
                        <XStack gap={12} alignItems='center'>
                            <FontAwesomeIcon icon={faMobileScreen} size={20} color={theme.primary.val} />
                            <YStack flex={1} gap={2}>
                                <UIText variant='bodyStrong'>{t('Account.addPhoneTitle')}</UIText>
                                <UIText variant='caption' tone='secondary'>
                                    {t('Account.addPhoneBody')}
                                </UIText>
                            </YStack>
                        </XStack>
                        <Button size='sm' onPress={() => navigation.navigate('AddPhone', { returnTo: 'Profile' })}>
                            {t('Account.addPhone')}
                        </Button>
                    </Card>
                )}

                {!!activeOrder && (
                    <Pressable
                        onPress={() => navigation.navigate('Order', { orderId: activeOrder.id })}
                        accessibilityRole='button'
                        accessibilityLabel={t('Account.activeOrderLabel', { id: activeOrder.reference })}
                    >
                        <Card appearance='raised' padding={16}>
                            <XStack gap={14} alignItems='center'>
                                <YStack width={44} height={44} borderRadius={22} backgroundColor='$primary' alignItems='center' justifyContent='center'>
                                    <FontAwesomeIcon icon={faTruckFast} size={18} color='#fff' />
                                </YStack>
                                <YStack flex={1} gap={2}>
                                    <UIText variant='captionStrong' tone='brand'>
                                        {t('Account.activeOrder')}
                                    </UIText>
                                    <UIText variant='bodyStrong' numberOfLines={1}>
                                        {t(`Tracking.phase.${activeOrder.phase}.title`, {
                                            store: '',
                                            driver: t('Tracking.yourDriver'),
                                        })}
                                    </UIText>
                                </YStack>
                                <UIText variant='captionStrong' tone='brand'>
                                    {t('Account.track')}
                                </UIText>
                            </XStack>
                        </Card>
                    </Pressable>
                )}

                <MenuGroup
                    rows={[
                        { key: 'orders', icon: faReceipt, label: t('Account.orders'), onPress: () => navigation.navigate('OrderHistory') },
                        { key: 'offers', icon: faTag, label: t('Account.offers'), onPress: () => openInHome('Offers') },
                        { key: 'places', icon: faLocationDot, label: t('Account.savedPlaces'), onPress: () => navigation.navigate('AddressBook') },
                        {
                            key: 'payment',
                            icon: faCreditCard,
                            label: t('Account.paymentMethods'),
                            hidden: gateway !== 'stripe' || GATEWAYS_WITHOUT_SAVED_METHODS.includes(gateway),
                            onPress: () => navigation.navigate('StripeCustomer'),
                        },
                        { key: 'notifications', icon: faBell, label: t('Account.notifications'), badge: unread, onPress: () => openInHome('Notifications') },
                    ]}
                />

                <MenuGroup
                    title={t('Account.preferences')}
                    rows={[
                        { key: 'language', icon: faGlobe, label: t('Account.language'), value: languageName, hidden: languages.length < 2, onPress: () => setSheet('language') },
                        { key: 'appearance', icon: faCircleHalfStroke, label: t('Account.appearance'), value: schemeLabel(userColorScheme), onPress: () => setSheet('appearance') },
                    ]}
                />

                <MenuGroup
                    title={t('Account.about')}
                    rows={[
                        { key: 'terms', icon: faFileLines, label: t('Auth.terms'), hidden: !terms, onPress: () => Linking.openURL(terms) },
                        { key: 'privacy', icon: faShieldHalved, label: t('Auth.privacy'), hidden: !privacy, onPress: () => Linking.openURL(privacy) },
                    ]}
                />

                <YStack gap={6}>
                    <Button variant='outline' size='lg' fullWidth onPress={logout}>
                        {t('Account.signOut')}
                    </Button>
                    <Button variant='ghost' fullWidth onPress={() => setSheet('delete')}>
                        <UIText variant='bodyStrong' tone='error'>
                            {t('Account.deleteAccount')}
                        </UIText>
                    </Button>
                </YStack>
            </ScrollView>

            <ChoiceSheet
                open={sheet === 'language'}
                title={t('Account.language')}
                options={languages.map((language: any) => ({ key: language.code, label: [language.emoji, language.native ?? language.name ?? language.code].filter(Boolean).join('  ') }))}
                selected={locale}
                onSelect={setLocale}
                onClose={() => setSheet(null)}
            />
            <ChoiceSheet
                open={sheet === 'appearance'}
                title={t('Account.appearance')}
                options={schemes.map((scheme: string) => ({ key: scheme, label: schemeLabel(scheme) }))}
                selected={userColorScheme}
                onSelect={changeScheme}
                onClose={() => setSheet(null)}
            />
            <Sheet
                open={sheet === 'delete'}
                onClose={() => setSheet(null)}
                title={t('Account.deleteTitle')}
                footer={
                    <YStack gap={8}>
                        <Button variant='destructive' size='lg' fullWidth loading={deleting} onPress={requestDeletion}>
                            {t('Account.sendDeleteCode')}
                        </Button>
                        <Button variant='ghost' fullWidth onPress={() => setSheet(null)}>
                            {t('Account.keepAccount')}
                        </Button>
                    </YStack>
                }
            >
                <UIText tone='secondary'>{t('Account.deleteBody')}</UIText>
            </Sheet>
        </YStack>
    );
};

export default AccountHomeScreen;
