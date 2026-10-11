import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faChevronRight, faReceipt } from '@fortawesome/free-solid-svg-icons';
import { format as formatDate } from 'date-fns';
import { XStack, YStack, useTheme } from 'tamagui';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useStorage from '../../hooks/use-storage';
import useFooterOffset from '../../hooks/use-footer-offset';
import { ORDER_PAGE_SIZE, groupOrders, itemsPreview, summarizeOrder, type OrderSummary } from '../../commerce/order-summary';
import { formatCurrency } from '../../utils/format';
import { Badge, Button, Card, EmptyState, ErrorState, IconButton, Skeleton, StoreLogo, UIText, radius, space } from '../../ui';

type Translate = (key: string, params?: Record<string, unknown>) => string;

function OrderMeta({ order, t }: { order: OrderSummary; t: Translate }) {
    const date = order.createdAt ? formatDate(new Date(order.createdAt), 'PP') : null;
    return (
        <UIText variant='caption' tone='secondary' numberOfLines={1}>
            {[date, t('Orders.items', { count: order.itemCount }), formatCurrency(order.total, order.currency ?? undefined)].filter(Boolean).join(' · ')}
        </UIText>
    );
}

/** An order still in progress: where it is now and a way to follow it. */
function ActiveOrderCard({ order, t, onPress }: { order: OrderSummary; t: Translate; onPress: () => void }) {
    return (
        <Card appearance='outlined' padding={16} gap={12}>
            <Pressable
                onPress={onPress}
                accessibilityRole='button'
                accessibilityLabel={t('Orders.activeLabel', { store: order.storeName, status: t(`Orders.status.${order.phase}`) })}
                style={{ gap: 12 }}
            >
                <XStack gap={12} alignItems='center'>
                    <StoreLogo uri={null} name={order.storeName} size={44} />
                    <YStack flex={1} gap={2}>
                        <UIText variant='bodyStrong' numberOfLines={1}>
                            {order.storeName}
                        </UIText>
                        <OrderMeta order={order} t={t} />
                    </YStack>
                    <Badge label={t(`Orders.status.${order.phase}`)} tone='brand' size='sm' />
                </XStack>
                <UIText tone='secondary' numberOfLines={1}>
                    {itemsPreview(order.lines, (count) => t('Orders.andMore', { count }))}
                </UIText>
            </Pressable>
            <Button size='sm' fullWidth onPress={onPress}>
                {order.isPickup ? t('Orders.viewPickup') : t('Orders.track')}
            </Button>
        </Card>
    );
}

/** A finished order: what, when and how much, with its receipt one tap away. */
function PastOrderRow({ order, t, onPress, onReceipt }: { order: OrderSummary; t: Translate; onPress: () => void; onReceipt: () => void }) {
    const theme = useTheme();
    return (
        <XStack alignItems='center' gap={12} paddingVertical={12} borderBottomWidth={1} borderColor='$borderColor'>
            <Pressable
                onPress={onPress}
                accessibilityRole='button'
                accessibilityLabel={t('Orders.pastLabel', { store: order.storeName, status: t(`Orders.status.${order.phase}`) })}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
                <StoreLogo uri={null} name={order.storeName} size={44} />
                <YStack flex={1} gap={3}>
                    <XStack alignItems='center' gap={8}>
                        <UIText variant='bodyStrong' numberOfLines={1} flexShrink={1}>
                            {order.storeName}
                        </UIText>
                        {order.canceled && <Badge label={t('Orders.status.canceled')} tone='error' size='sm' />}
                    </XStack>
                    <UIText tone='secondary' numberOfLines={1}>
                        {itemsPreview(order.lines, (count) => t('Orders.andMore', { count }))}
                    </UIText>
                    <OrderMeta order={order} t={t} />
                </YStack>
                <FontAwesomeIcon icon={faChevronRight} size={13} color={theme.textSecondary.val} />
            </Pressable>
            {!order.canceled && <IconButton icon={faReceipt} variant='plain' size={44} accessibilityLabel={t('Orders.receiptFor', { store: order.storeName })} onPress={onReceipt} />}
        </XStack>
    );
}

function HistorySkeleton() {
    return (
        <YStack gap={14} paddingTop={8}>
            <Skeleton height={150} radius={radius.card} />
            {[0, 1, 2, 3].map((key) => (
                <XStack key={key} gap={12} alignItems='center'>
                    <Skeleton height={44} width={44} radius={radius.tile} />
                    <YStack flex={1} gap={6}>
                        <Skeleton height={16} width='55%' />
                        <Skeleton height={14} width='80%' />
                    </YStack>
                </XStack>
            ))}
        </YStack>
    );
}

/**
 * The customer's orders: those in progress pinned on top, then past orders newest first,
 * loaded a page at a time. The first page is kept on the device so the list (and the
 * account screen's active order) shows instantly next time.
 */
const OrderHistoryScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const footer = useFooterOffset(false);
    const { t } = useLanguage();
    const { mode } = useStorefrontRuntime();
    const { customer } = useAuth() as any;
    const [cached, setCached] = useStorage<any[]>(`${customer?.id}_orders`, []);
    const [dirty, setDirty] = useStorage<boolean>(`${customer?.id}_orders_dirty`, false);
    const [pages, setPages] = useState<any[] | null>(null);
    const [state, setState] = useState<'idle' | 'loading' | 'refreshing' | 'more' | 'error'>('idle');
    const [exhausted, setExhausted] = useState(false);
    const busy = useRef(false);

    const raw = useMemo(() => pages ?? (Array.isArray(cached) ? cached : []), [pages, cached]);
    const { active, past } = useMemo(() => groupOrders(raw.map(summarizeOrder)), [raw]);
    const byId = useMemo(() => new Map(raw.map((json: any) => [String(json?.id), json])), [raw]);

    const load = useCallback(
        async (kind: 'loading' | 'refreshing' | 'more') => {
            if (!customer || busy.current) return;
            busy.current = true;
            setState(kind);
            const offset = kind === 'more' ? (pages?.length ?? 0) : 0;
            try {
                const result = await customer.getOrderHistory({ sort: '-created_at', limit: ORDER_PAGE_SIZE, offset });
                const serialized = (Array.isArray(result) ? result : Array.from(result ?? [])).map((order: any) => (typeof order?.serialize === 'function' ? order.serialize() : order));
                setExhausted(serialized.length < ORDER_PAGE_SIZE);
                if (kind === 'more') {
                    setPages((current) => [...(current ?? []), ...serialized]);
                } else {
                    setPages(serialized);
                    setCached(serialized);
                    setDirty(false);
                }
                setState('idle');
            } catch {
                setState('error');
            } finally {
                busy.current = false;
            }
        },
        [customer, pages, setCached, setDirty]
    );

    // Fetch on first view, and again when a new order has been placed since.
    useFocusEffect(
        useCallback(() => {
            if (pages === null || dirty) load('loading');
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [dirty])
    );

    const open = (summary: OrderSummary) => navigation.navigate('Order', { order: byId.get(summary.id) ?? { id: summary.id } });
    const receipt = (summary: OrderSummary) => navigation.navigate('Receipt', { order: byId.get(summary.id) ?? { id: summary.id } });

    const firstLoad = pages === null && raw.length === 0;
    const sections = [
        { key: 'active', title: t('Orders.inProgress'), data: active },
        { key: 'past', title: t('Orders.past'), data: past },
    ].filter((section) => section.data.length);

    return (
        <YStack flex={1} backgroundColor='$background'>
            <XStack paddingTop={insets.top + 4} paddingHorizontal={space.gutter - 10} alignItems='center' gap={4}>
                {navigation.canGoBack() && <IconButton icon={faChevronLeft} variant='plain' size={44} accessibilityLabel={t('UI.back')} onPress={() => navigation.goBack()} />}
                <UIText variant='title' accessibilityRole='header' style={{ marginLeft: navigation.canGoBack() ? 0 : 10 }}>
                    {t('Orders.title')}
                </UIText>
            </XStack>

            {firstLoad && state === 'error' ? (
                <YStack flex={1} justifyContent='center'>
                    <ErrorState title={t('Orders.loadFailed')} onRetry={() => load('loading')} />
                </YStack>
            ) : firstLoad ? (
                <YStack paddingHorizontal={space.gutter}>
                    <HistorySkeleton />
                </YStack>
            ) : (
                <SectionList
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    sections={sections}
                    keyExtractor={(order) => order.id}
                    stickySectionHeadersEnabled={false}
                    contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: footer + insets.bottom + 24, flexGrow: 1 }}
                    renderSectionHeader={({ section }) => (
                        <UIText
                            variant='captionStrong'
                            tone='secondary'
                            accessibilityRole='header'
                            style={{ textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 10 }}
                        >
                            {section.title}
                        </UIText>
                    )}
                    renderItem={({ item, section }) =>
                        section.key === 'active' ? (
                            <YStack marginBottom={12}>
                                <ActiveOrderCard order={item} t={t} onPress={() => open(item)} />
                            </YStack>
                        ) : (
                            <PastOrderRow order={item} t={t} onPress={() => open(item)} onReceipt={() => receipt(item)} />
                        )
                    }
                    // Plain views: on the web the list hands these a style array.
                    ListEmptyComponent={
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                            <EmptyState
                                icon={faReceipt}
                                title={t('Orders.emptyTitle')}
                                description={t('Orders.emptyBody')}
                                actionLabel={t('Orders.startShopping')}
                                onAction={() => navigation.navigate(mode === 'network' ? 'NetworkHomeTab' : 'StoreHomeTab')}
                            />
                        </View>
                    }
                    ListFooterComponent={
                        state === 'more' ? (
                            <ActivityIndicator style={{ marginVertical: 20 }} />
                        ) : state === 'error' && raw.length ? (
                            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 16 }}>
                                <UIText tone='secondary'>{t('Orders.loadFailed')}</UIText>
                                <Button variant='outline' size='sm' onPress={() => load(pages && pages.length ? 'more' : 'loading')}>
                                    {t('Orders.retry')}
                                </Button>
                            </View>
                        ) : null
                    }
                    onEndReachedThreshold={0.4}
                    onEndReached={() => {
                        if (pages && !exhausted && state === 'idle') load('more');
                    }}
                    refreshControl={<RefreshControl refreshing={state === 'refreshing'} onRefresh={() => load('refreshing')} />}
                />
            )}
        </YStack>
    );
};

export default OrderHistoryScreen;
