import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCartShopping, faTag, faTicket } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import useFooterOffset from '../hooks/use-footer-offset';
import useCart from '../hooks/use-cart';
import useStorefront from '../hooks/use-storefront';
import useStorefrontInfo from '../hooks/use-storefront-info';
import useCartPromotions from '../hooks/use-cart-promotions';
import { useLanguage } from '../contexts/LanguageContext';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';
import { loadPersistedResource, storefrontConfig } from '../utils';
import { formatCurrency } from '../utils/format';
import { toast } from '../utils/toast';
import { rememberStores } from '../network/store-names';
import {
    Button,
    Card,
    EmptyState,
    MediaImage,
    Sheet,
    Skeleton,
    Stepper,
    StoreLogo,
    TextField,
    UIText,
    cartGroups,
    cartTotals,
    checkoutBlock,
    elevation,
    radius,
    space,
    type CartGroup,
    type CartLine,
    type CartStoreInfo,
} from '../ui';

/** What the cart needs from a store record: name, logo and minimum order. */
function storeInfo(store: any): CartStoreInfo {
    const get = (key: string) => (typeof store?.getAttribute === 'function' ? store.getAttribute(key) : store?.[key]);
    const options = get('options') ?? {};
    return {
        name: get('name') ?? null,
        logoUrl: get('logo_url') ?? null,
        minimum: options.required_checkout_min === true || Number(options.required_checkout_min_amount) > 0 ? Number(options.required_checkout_min_amount) || 0 : 0,
    };
}

/**
 * The cart: lines grouped by the store that sells them, each store's subtotal and
 * minimum-order progress, promotions and promo codes, and a sticky checkout footer that
 * says plainly why checkout is unavailable when it is.
 */
const CartScreen = ({ route }: any) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const { storefront } = useStorefront();
    const { info } = useStorefrontInfo();
    const { mode, ownerInfo } = useStorefrontRuntime();
    const [cart, updateCart, isLoading] = useCart();
    const [stores, setStores] = useState<Record<string, CartStoreInfo>>({});
    const [busyLine, setBusyLine] = useState<string | null>(null);
    const [confirmClear, setConfirmClear] = useState(false);
    const [clearing, setClearing] = useState(false);
    const promo = useCartPromotions({ hints: true });
    const isNetwork = mode === 'network';
    const isModal = typeof route?.name === 'string' && route.name.endsWith('Modal');
    const bottomOffset = useFooterOffset(isModal);
    const currency = cart?.getAttribute?.('currency') ?? info?.currency ?? 'USD';
    const money = useCallback((amount: number) => formatCurrency(amount, currency), [currency]);

    const items = useMemo(() => cart?.contents?.() ?? [], [cart]);
    const groups = useMemo(() => cartGroups(items, isNetwork ? stores : { [items[0]?.store_id ?? 'store']: storeInfo(info) }), [info, isNetwork, items, stores]);
    const totals = cartTotals(groups);
    const block = checkoutBlock(groups, { requireLocation: isNetwork });
    const total = Math.max(0, totals.subtotal - promo.promotions.discountSubtotal);

    // Look up each store in the cart once for its logo and minimum order.
    const storeIds = groups.map((group) => group.storeId).join(',');
    useEffect(() => {
        if (!isNetwork || !storefront) return;
        const missing = groups.map((group) => group.storeId).filter((id) => id !== 'store' && !stores[id]);
        if (missing.length === 0) return;
        let active = true;
        Promise.all(missing.map((id) => storefront.lookup(id).then((store: any) => [id, store] as const, () => [id, null] as const))).then((results) => {
            if (!active) return;
            setStores((current) => {
                const next = { ...current };
                for (const [id, store] of results) next[id] = store ? storeInfo(store) : { name: null };
                return next;
            });
            rememberStores(results.map(([id, store]) => ({ id, name: storeInfo(store).name ?? '', logoUrl: storeInfo(store).logoUrl ?? null })));
        });
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isNetwork, storefront, storeIds]);

    const setQuantity = async (line: CartLine, quantity: number) => {
        if (!cart || busyLine) return;
        setBusyLine(line.id);
        try {
            const item = items.find((entry: any) => entry.id === line.id) ?? {};
            const updated = quantity <= 0 ? await cart.remove(line.id) : await cart.update(line.id, quantity, { variants: item.variants ?? [], addons: item.addons ?? [] });
            updateCart(updated);
            if (quantity <= 0) toast.success(t('CartScreen.itemRemovedFromCart', { cartItemName: line.name }));
        } catch (error: any) {
            toast.error(error?.message || t('Cart.updateFailed'));
        } finally {
            setBusyLine(null);
        }
    };

    const editLine = async (line: CartLine) => {
        if (!line.productId) return;
        const item = items.find((entry: any) => entry.id === line.id);
        const product = await loadPersistedResource((sdk: any) => sdk.products.findRecord(line.productId), { type: 'product', persistKey: `${line.productId}_product` });
        if (product) navigation.navigate('CartItem', { cartItem: item, product: product.serialize(), isModal });
    };

    const clearCart = async () => {
        if (!cart) return;
        setClearing(true);
        try {
            updateCart(await cart.empty());
            setConfirmClear(false);
        } catch {
            toast.error(t('CartScreen.failedToEmptyCart'));
        } finally {
            setClearing(false);
        }
    };

    const browse = () => (isNetwork ? navigation.navigate('NetworkHomeTab') : navigation.navigate('StoreHomeTab'));
    const openStore = (storeId: string) => (isNetwork ? navigation.navigate('NetworkHomeTab', { screen: 'NetworkStore', params: { storeId } }) : navigation.navigate('StoreHomeTab'));

    const checkout = () => {
        if (block) return;
        const gateway = storefrontConfig('paymentGateway');
        if (gateway === 'qpay') return navigation.navigate('QPayCheckout');
        if (gateway === 'paypal') return navigation.navigate('PaypalCheckout');
        return navigation.navigate('StripeCheckout');
    };

    const blockText = !block
        ? null
        : block.reason === 'closed'
          ? t('Cart.blockedClosed', { store: block.storeName ?? t('StoreSwitch.thisStore') })
          : block.reason === 'location'
            ? t('Cart.blockedLocation', { store: block.storeName ?? t('StoreSwitch.thisStore') })
            : t('Cart.blockedMinimum', { amount: money(block.remaining ?? 0), store: block.storeName ?? t('StoreSwitch.thisStore') });

    const hasItems = groups.length > 0;
    const networkName = ownerInfo?.name ?? info?.name ?? '';

    if (isLoading && !hasItems) {
        return (
            <YStack flex={1} backgroundColor='$surface' paddingTop={insets.top + 16} paddingHorizontal={space.gutter} gap={12}>
                <Skeleton height={30} width='30%' />
                <Skeleton height={180} radius={radius.card} />
                <Skeleton height={120} radius={radius.card} />
            </YStack>
        );
    }

    return (
        <YStack flex={1} backgroundColor='$surface'>
            <ScrollView contentContainerStyle={{ paddingTop: (isModal ? 12 : insets.top) + 8, paddingBottom: hasItems ? 230 : 40 }} keyboardShouldPersistTaps='handled'>
                <XStack alignItems='flex-end' justifyContent='space-between' paddingHorizontal={space.gutter} paddingBottom={14} paddingTop={8}>
                    <YStack>
                        <UIText variant='display' accessibilityRole='header'>
                            {t('Cart.title')}
                        </UIText>
                        {hasItems && (
                            <UIText tone='secondary'>
                                {isNetwork && totals.storeCount > 1 ? t('Cart.storesAndItems', { stores: totals.storeCount, items: t('UI.itemsCount', { count: totals.itemCount }) }) : t('UI.itemsCount', { count: totals.itemCount })}
                            </UIText>
                        )}
                    </YStack>
                    {hasItems && <Button variant='ghost' size='sm' onPress={() => setConfirmClear(true)}>{t('Cart.clear')}</Button>}
                </XStack>

                {!hasItems ? (
                    <EmptyState icon={faCartShopping} title={t('Cart.emptyTitle')} description={isNetwork ? t('Cart.emptyBodyNetwork', { network: networkName }) : t('Cart.emptyBody')} actionLabel={isNetwork ? t('Cart.browseStores') : t('Cart.startShopping')} onAction={browse} />
                ) : (
                    <YStack gap={12} paddingHorizontal={space.gutter}>
                        {groups.map((group) => (
                            <StoreGroup key={group.storeId} group={group} money={money} busyLine={busyLine} showHeader={isNetwork} onQuantity={setQuantity} onEdit={editLine} onAddMore={() => openStore(group.storeId)} />
                        ))}
                        <PromotionsCard promo={promo} money={money} />
                    </YStack>
                )}
            </ScrollView>

            {hasItems && (
                <YStack position='absolute' left={0} right={0} bottom={bottomOffset} paddingHorizontal={space.gutter} paddingTop={14} paddingBottom={14} gap={8} backgroundColor='$background' borderTopWidth={1} borderColor='$borderColor' style={elevation.floating}>
                    <XStack justifyContent='space-between'>
                        <UIText tone='secondary'>{t('Cart.subtotal')}</UIText>
                        <UIText tone='secondary'>{money(totals.subtotal)}</UIText>
                    </XStack>
                    {promo.promotions.applied
                        .filter((applied) => applied.amount > 0)
                        .map((applied) => (
                            <XStack key={`${applied.promotionId}-${applied.code}`} justifyContent='space-between'>
                                <UIText tone='success'>{applied.code ?? applied.name}</UIText>
                                <UIText tone='success'>−{money(applied.amount)}</UIText>
                            </XStack>
                        ))}
                    <UIText variant='caption' tone='secondary'>
                        {t('Cart.feesAtCheckout')}
                    </UIText>
                    {blockText ? (
                        <YStack gap={6}>
                            <UIText variant='captionStrong' tone='warning' accessibilityRole='alert'>
                                {blockText}
                            </UIText>
                            <Button size='lg' fullWidth disabled>
                                {t('Cart.goToCheckout')}
                            </Button>
                        </YStack>
                    ) : (
                        <Button size='lg' fullWidth onPress={checkout} trailing={money(total)}>
                            {t('Cart.goToCheckout')}
                        </Button>
                    )}
                </YStack>
            )}

            <Sheet
                open={confirmClear}
                onClose={() => setConfirmClear(false)}
                title={t('Cart.clearTitle')}
                footer={
                    <YStack gap={8}>
                        <Button variant='destructive' size='lg' fullWidth loading={clearing} onPress={clearCart}>
                            {t('Cart.clear')}
                        </Button>
                        <Button variant='ghost' size='lg' fullWidth onPress={() => setConfirmClear(false)}>
                            {t('Cart.keepItems')}
                        </Button>
                    </YStack>
                }
            >
                <UIText tone='secondary'>{t('Cart.clearBody', { items: t('UI.itemsCount', { count: totals.itemCount }) })}</UIText>
            </Sheet>
        </YStack>
    );
};

function StoreGroup({ group, money: format, busyLine: busy, showHeader, onQuantity, onEdit, onAddMore }: { group: CartGroup; money: (amount: number) => string; busyLine: string | null; showHeader: boolean; onQuantity: (line: CartLine, quantity: number) => void; onEdit: (line: CartLine) => void; onAddMore: () => void }) {
    const { t } = useLanguage();
    return (
        <Card accessibilityLabel={group.name ? t('Cart.itemsFrom', { store: group.name }) : undefined}>
            {showHeader && (
                <XStack alignItems='center' gap={10} paddingHorizontal={14} paddingVertical={12} borderBottomWidth={1} borderColor='$borderColor'>
                    <StoreLogo uri={group.logoUrl} name={group.name ?? '?'} size={36} radius={radius.tile} />
                    <YStack flex={1}>
                        <UIText variant='bodyStrong' numberOfLines={1}>
                            {group.name ?? t('StoreSwitch.thisStore')}
                        </UIText>
                        <UIText variant='captionStrong' tone={group.open ? 'success' : 'warning'}>
                            {group.open ? t('Cart.storeOpen') : t('UI.notAcceptingOrders')}
                        </UIText>
                    </YStack>
                    <Button variant='ghost' size='sm' onPress={onAddMore}>
                        {t('Cart.addMore')}
                    </Button>
                </XStack>
            )}
            {group.lines.map((line) => (
                <XStack key={line.id} gap={12} paddingHorizontal={14} paddingVertical={12} borderBottomWidth={1} borderColor='$borderColor' opacity={busy === line.id ? 0.6 : 1}>
                    <Pressable onPress={() => onEdit(line)} accessibilityRole='button' accessibilityLabel={t('Cart.editLine', { name: line.name })} style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
                        <MediaImage uri={line.imageUrl} seed={line.name} width={56} height={56} radius={radius.tile} />
                        <YStack flex={1} gap={2}>
                            <UIText variant='bodyStrong' style={{ fontSize: 14 }} numberOfLines={2}>
                                {line.name}
                            </UIText>
                            {!!line.options && (
                                <UIText variant='caption' tone='secondary' numberOfLines={2}>
                                    {line.options}
                                </UIText>
                            )}
                            <UIText variant='bodyStrong' style={{ fontSize: 14 }}>
                                {format(line.lineTotal)}
                            </UIText>
                        </YStack>
                    </Pressable>
                    <YStack justifyContent='center'>
                        <Stepper size='sm' value={line.quantity} min={1} max={99} itemName={line.name} onChange={(quantity) => onQuantity(line, quantity)} onRemove={() => onQuantity(line, 0)} />
                    </YStack>
                </XStack>
            ))}
            <YStack paddingHorizontal={14} paddingVertical={12} gap={8}>
                <XStack justifyContent='space-between'>
                    <UIText tone='secondary'>{showHeader ? t('Cart.storeSubtotal') : t('Cart.subtotal')}</UIText>
                    <UIText variant='bodyStrong'>{format(group.subtotal)}</UIText>
                </XStack>
                {group.belowMinimum && (
                    <YStack gap={6} accessibilityRole='progressbar' accessibilityValue={{ min: 0, max: 100, now: group.progress }}>
                        <YStack height={6} borderRadius={radius.pill} backgroundColor='$surface2' overflow='hidden'>
                            <YStack height={6} width={`${group.progress}%`} borderRadius={radius.pill} backgroundColor='$warning' />
                        </YStack>
                        <UIText variant='captionStrong' tone='warning'>
                            {t('Cart.minimumRemaining', { amount: format(group.remaining), minimum: format(group.minimum) })}
                        </UIText>
                    </YStack>
                )}
                {group.missingLocation && showHeader && (
                    <UIText variant='captionStrong' tone='warning'>
                        {t('Cart.lineNeedsLocation')}
                    </UIText>
                )}
            </YStack>
        </Card>
    );
}

function PromotionsCard({ promo: state, money: format }: { promo: ReturnType<typeof useCartPromotions>; money: (amount: number) => string }) {
    const { t } = useLanguage();
    const theme = useTheme();
    const [code, setCode] = useState('');
    const submit = async () => {
        if (!code.trim()) return;
        if (await state.apply(code)) setCode('');
    };
    const appliedCodes = new Set(state.promotions.applied.map((applied) => applied.code).filter(Boolean));

    return (
        <Card padding={14} gap={12} accessibilityLabel={t('Cart.promotions')}>
            <UIText variant='subheading'>{t('Cart.promotions')}</UIText>
            {state.promotions.applied.map((applied) => (
                <XStack key={`${applied.promotionId}-${applied.code}`} alignItems='center' gap={10} paddingHorizontal={12} paddingVertical={10} borderRadius={radius.button} backgroundColor='$successSoft'>
                    <FontAwesomeIcon icon={faTag} size={16} color={theme.successForeground.val} />
                    <UIText flex={1} variant='caption'>
                        <UIText variant='captionStrong'>{applied.code ?? applied.name}</UIText>
                        {applied.amount > 0 ? ` · ${t('Cart.saving', { amount: format(applied.amount) })}` : applied.deliveryAmount > 0 || applied.type === 'free_delivery' ? ` · ${t('Cart.freeDelivery')}` : ''}
                    </UIText>
                    {!!applied.code && (
                        <Button variant='ghost' size='sm' disabled={state.applying} onPress={() => state.remove(applied.code!)} accessibilityLabel={t('Cart.removeCode', { code: applied.code })}>
                            {t('UI.remove')}
                        </Button>
                    )}
                </XStack>
            ))}
            {state.codes
                .filter((pending) => !appliedCodes.has(pending))
                .map((pending) => (
                    <XStack key={pending} alignItems='center' gap={10} paddingHorizontal={12} paddingVertical={10} borderRadius={radius.button} borderWidth={1} borderColor='$borderColor'>
                        <FontAwesomeIcon icon={faTicket} size={16} color={theme.textSecondary.val} />
                        <UIText flex={1} variant='caption' tone='secondary'>
                            <UIText variant='captionStrong'>{pending}</UIText> · {t('Cart.codeNotApplying')}
                        </UIText>
                        <Button variant='ghost' size='sm' disabled={state.applying} onPress={() => state.remove(pending)} accessibilityLabel={t('Cart.removeCode', { code: pending })}>
                            {t('UI.remove')}
                        </Button>
                    </XStack>
                ))}
            {state.hints.slice(0, 2).map((hint) => (
                <XStack key={hint.id} paddingHorizontal={12} paddingVertical={10} borderRadius={radius.button} borderWidth={1} borderStyle='dashed' borderColor='$borderColorWithShadow'>
                    <UIText flex={1} variant='caption' tone='secondary'>
                        <UIText variant='captionStrong'>{hint.name}</UIText> · {t('Cart.hintSpendMore', { amount: format(hint.remaining) })}
                    </UIText>
                </XStack>
            ))}
            <XStack gap={8}>
                <YStack flex={1}>
                    <TextField
                        value={code}
                        onChangeText={(value) => {
                            setCode(value);
                            if (state.error) state.clearError();
                        }}
                        placeholder={t('Cart.promoPlaceholder')}
                        autoCapitalize='characters'
                        autoCorrect={false}
                        returnKeyType='done'
                        onSubmitEditing={submit}
                        invalid={!!state.error}
                        height={44}
                        accessibilityLabel={t('Cart.promoLabel')}
                    />
                </YStack>
                <Button variant='soft' onPress={submit} loading={state.applying} disabled={!code.trim()}>
                    {t('Cart.apply')}
                </Button>
            </XStack>
            {!!state.error && (
                <UIText variant='captionStrong' tone='error' accessibilityRole='alert'>
                    {t(`Cart.promoErrors.${state.error}`)}
                </UIText>
            )}
        </Card>
    );
}

export default CartScreen;
