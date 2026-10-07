import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, RefreshControl, SectionList, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBell, faBoxOpen, faChevronLeft, faComment, faGear, faTag, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useCustomerRequest from '../../hooks/use-customer-request';
import useOpenNotification from '../../hooks/use-open-notification';
import { setUnreadCount } from '../../hooks/use-unread-notifications';
import { dayGroup, deleteNotification, fetchInbox, markAllRead, markRead, type InboxItem } from '../../commerce/notifications';
import { relativeTime } from '../../commerce/reviews';
import { toast } from '../../utils/toast';
import { Button, EmptyState, ErrorState, IconButton, Skeleton, UIText, radius, space } from '../../ui';

const PAGE = 25;
const FILTERS = ['all', 'orders', 'offers'] as const;
type Filter = (typeof FILTERS)[number];

const ICONS = { order: faBoxOpen, chat: faComment, offer: faTag, other: faBell } as const;

/**
 * The notification inbox: order updates, driver messages and offers, newest first in
 * Today / Earlier, with filters, mark all read, swipe (or the accessibility action) to
 * delete, and tapping to open what the notification is about.
 */
const NotificationsScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t, locale } = useLanguage();
    const { customer } = useAuth();
    const { mode } = useStorefrontRuntime();
    const request = useCustomerRequest();
    const open = useOpenNotification();
    const [items, setItems] = useState<InboxItem[]>([]);
    const [filter, setFilter] = useState<Filter>('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    const [done, setDone] = useState(false);
    const swipeables = useRef<Record<string, Swipeable | null>>({});
    const now = useMemo(() => new Date(), [items]); // eslint-disable-line react-hooks/exhaustive-deps

    const syncUnread = (list: InboxItem[]) => setUnreadCount(list.filter((item) => !item.read).length);

    const load = useCallback(
        async (refresh = false) => {
            if (!customer) return;
            refresh ? setRefreshing(true) : setLoading(true);
            setError(false);
            try {
                const page = await fetchInbox(request, { limit: PAGE });
                setItems(page);
                setDone(page.length < PAGE);
                if (page.length < PAGE) syncUnread(page);
            } catch {
                setError(true);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [customer, request]
    );

    useEffect(() => {
        load();
    }, [load]);

    const first = useRef(true);
    useFocusEffect(
        useCallback(() => {
            if (!first.current) load(true);
            first.current = false;
        }, [load])
    );

    const loadMore = async () => {
        if (loading || done) return;
        try {
            const next = await fetchInbox(request, { limit: PAGE, offset: items.length });
            setItems((current) => [...current, ...next.filter((item) => !current.some((existing) => existing.id === item.id))]);
            setDone(next.length < PAGE);
        } catch {
            setDone(true);
        }
    };

    const openItem = async (item: InboxItem) => {
        if (!item.read) {
            setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)));
            markRead(request, item.id)
                .then(() => setUnreadCount(Math.max(0, items.filter((entry) => !entry.read).length - 1)))
                .catch(() => {});
        }
        open(item.target);
    };

    const remove = async (item: InboxItem) => {
        const before = items;
        setItems((current) => current.filter((entry) => entry.id !== item.id));
        try {
            await deleteNotification(request, item.id);
            if (!item.read) setUnreadCount(before.filter((entry) => !entry.read && entry.id !== item.id).length);
        } catch {
            setItems(before);
            toast.error(t('Notifications.deleteFailed'));
        }
    };

    const readAll = async () => {
        const before = items;
        setItems((current) => current.map((entry) => ({ ...entry, read: true })));
        try {
            await markAllRead(request);
            setUnreadCount(0);
        } catch {
            setItems(before);
            toast.error(t('Notifications.updateFailed'));
        }
    };

    const visible = items.filter((item) => filter === 'all' || (filter === 'orders' ? item.kind === 'order' || item.kind === 'chat' : item.kind === 'offer'));
    const sections = (['today', 'earlier'] as const)
        .map((key) => ({ key, title: t(`Notifications.${key}`), data: visible.filter((item) => dayGroup(item.createdAt, now) === key) }))
        .filter((section) => section.data.length > 0);
    const anyUnread = items.some((item) => !item.read);

    const header = (
        <XStack alignItems='center' gap={8} paddingHorizontal={8} paddingTop={insets.top + 4} paddingBottom={8}>
            <IconButton icon={faChevronLeft} variant='plain' size={44} accessibilityLabel={t('UI.back')} onPress={() => navigation.goBack()} />
            <UIText flex={1} variant='heading' accessibilityRole='header'>
                {t('Notifications.title')}
            </UIText>
            {!!customer && <IconButton icon={faGear} variant='plain' size={44} accessibilityLabel={t('Notifications.settings')} onPress={() => navigation.navigate('NotificationSettings')} />}
        </XStack>
    );

    if (!customer) {
        return (
            <YStack flex={1} backgroundColor='$background'>
                {header}
                <EmptyState icon={faBell} title={t('Notifications.signInTitle')} description={t('Notifications.signInBody')} actionLabel={t('Checkout.signIn')} onAction={() => navigation.navigate(mode === 'network' ? 'NetworkProfileTab' : 'StoreProfileTab', { screen: 'Login' })} />
            </YStack>
        );
    }

    return (
        <YStack flex={1} backgroundColor='$background'>
            {header}
            {loading ? (
                <YStack paddingHorizontal={space.gutter} gap={16}>
                    {[0, 1, 2, 3].map((index) => (
                        <XStack key={index} gap={12}>
                            <Skeleton width={44} height={44} radius={22} />
                            <YStack flex={1} gap={6}>
                                <Skeleton height={16} width='60%' />
                                <Skeleton height={14} width='90%' />
                            </YStack>
                        </XStack>
                    ))}
                </YStack>
            ) : error ? (
                <ErrorState title={t('Notifications.loadFailed')} onRetry={() => load()} />
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => item.id}
                    stickySectionHeadersEnabled={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                    ListHeaderComponent={
                        items.length > 0 ? (
                            <XStack alignItems='center' justifyContent='space-between' paddingHorizontal={space.gutter} paddingBottom={8}>
                                <XStack gap={6} accessibilityRole='tablist' accessibilityLabel={t('Notifications.filterLabel')}>
                                    {FILTERS.map((option) => {
                                        const selected = option === filter;
                                        return (
                                            <Pressable key={option} onPress={() => setFilter(option)} accessibilityRole='tab' accessibilityState={{ selected }} style={{ height: 34, paddingHorizontal: 12, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: selected ? theme.textPrimary.val : theme.surface.val }}>
                                                <UIText variant='captionStrong' style={{ color: selected ? theme.background.val : theme.textPrimary.val }}>
                                                    {t(`Notifications.filters.${option}`)}
                                                </UIText>
                                            </Pressable>
                                        );
                                    })}
                                </XStack>
                                <Button variant='ghost' size='sm' disabled={!anyUnread} onPress={readAll}>
                                    {t('Notifications.markAllRead')}
                                </Button>
                            </XStack>
                        ) : null
                    }
                    renderSectionHeader={({ section }) => (
                        <UIText variant='label' tone='secondary' style={{ marginTop: 10, marginBottom: 2, marginHorizontal: space.gutter }} accessibilityRole='header'>
                            {section.title}
                        </UIText>
                    )}
                    renderItem={({ item }) => (
                        <Swipeable
                            ref={(ref) => {
                                swipeables.current[item.id] = ref;
                            }}
                            friction={2}
                            rightThreshold={40}
                            overshootRight={false}
                            renderRightActions={() => (
                                <Pressable onPress={() => remove(item)} accessibilityRole='button' accessibilityLabel={t('Notifications.delete')} style={{ width: 88, backgroundColor: theme.error.val, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                    <FontAwesomeIcon icon={faTrashCan} size={18} color='#ffffff' />
                                    <UIText variant='captionStrong' style={{ color: '#ffffff' }}>
                                        {t('Notifications.delete')}
                                    </UIText>
                                </Pressable>
                            )}
                        >
                            <NotificationRow item={item} when={relativeTime(item.createdAt, now, locale)} onPress={() => openItem(item)} onDelete={() => remove(item)} />
                        </Swipeable>
                    )}
                    ListEmptyComponent={
                        <View>
                            <EmptyState icon={faBell} title={filter === 'all' ? t('Notifications.emptyTitle') : t('Notifications.emptyFiltered')} description={filter === 'all' ? t('Notifications.emptyBody') : undefined} />
                        </View>
                    }
                    ListFooterComponent={
                        items.length > 0 ? (
                            <UIText variant='caption' tone='secondary' textAlign='center' style={{ marginTop: 18 }}>
                                {t('Notifications.swipeHint')}
                            </UIText>
                        ) : null
                    }
                />
            )}
        </YStack>
    );
};

function NotificationRow({ item, when, onPress, onDelete }: { item: InboxItem; when: string | null; onPress: () => void; onDelete: () => void }) {
    const theme = useTheme();
    const { t } = useLanguage();
    const tone = { order: ['$primarySoft', theme.primaryForeground.val], chat: ['$successSoft', theme.successForeground.val], offer: ['$warningSoft', theme.warningForeground.val], other: ['$surface', theme.textSecondary.val] }[item.kind];
    const action = item.target ? { order: t('Notifications.trackOrder'), chat: t('Notifications.openChat'), offer: t('Notifications.viewOffer'), other: null }[item.kind] : null;

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole='button'
            accessibilityLabel={`${item.read ? '' : `${t('Notifications.unread')}. `}${item.title}. ${item.body}`}
            accessibilityActions={[{ name: 'delete', label: t('Notifications.delete') }]}
            onAccessibilityAction={(event) => event.nativeEvent.actionName === 'delete' && onDelete()}
        >
            <XStack gap={12} paddingHorizontal={space.gutter} paddingVertical={14} borderBottomWidth={1} borderColor='$borderColor' backgroundColor={item.read ? '$background' : '$primarySoft'}>
                <YStack width={44} height={44} borderRadius={item.kind === 'offer' ? radius.tile : 22} backgroundColor={tone[0] as any} alignItems='center' justifyContent='center'>
                    <FontAwesomeIcon icon={ICONS[item.kind]} size={18} color={tone[1]} />
                </YStack>
                <YStack flex={1} gap={3}>
                    <XStack justifyContent='space-between' gap={8}>
                        <UIText flex={1} variant={item.read ? 'body' : 'bodyStrong'} style={{ fontWeight: item.read ? '600' : '800' }} numberOfLines={2}>
                            {item.title}
                        </UIText>
                        {!!when && (
                            <UIText variant='caption' tone='secondary' style={{ fontSize: 12 }}>
                                {when}
                            </UIText>
                        )}
                    </XStack>
                    {!!item.body && item.body !== item.title && (
                        <UIText variant='caption' tone='secondary' style={{ fontSize: 14, lineHeight: 20 }}>
                            {item.body}
                        </UIText>
                    )}
                    {!!item.imageUrl && <Image source={{ uri: item.imageUrl }} style={{ height: 110, borderRadius: radius.tile, marginTop: 6 }} resizeMode='cover' accessibilityIgnoresInvertColors />}
                    {!!action && (
                        <UIText variant='captionStrong' tone='brand' style={{ marginTop: 4 }}>
                            {action} →
                        </UIText>
                    )}
                </YStack>
                {!item.read && <YStack width={10} height={10} marginTop={6} borderRadius={5} backgroundColor='$primary' />}
            </XStack>
        </Pressable>
    );
}

export default NotificationsScreen;
