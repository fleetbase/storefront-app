import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCalendarDays, faChevronLeft, faCircleExclamation, faLocationDot, faLock } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useStorefrontInfo from '../../hooks/use-storefront-info';
import useCartPickup from '../../network/use-cart-pickup';
import useSavedLocations from '../../hooks/use-saved-locations';
import useCartPromotions from '../../hooks/use-cart-promotions';
import { formatCurrency } from '../../utils/format';
import {
    Button,
    Card,
    IconButton,
    LocationSheet,
    SegmentedControl,
    Skeleton,
    StoreLogo,
    TextField,
    UIText,
    cartGroups,
    elevation,
    formatClock,
    radius,
    space,
    usesTwelveHourClock,
} from '../../ui';
import TipSelector from './TipSelector';
import { RoutePreview, type RouteStore } from './RoutePreview';
import { parseScheduledAt } from '../../commerce/booking';

/** The fields every gateway's checkout hook provides (Stripe, QPay). */
export type CheckoutState = {
    cart: any;
    /** A paid checkout whose order still has to be created (Stripe only). */
    pendingCapture?: { token: string } | null;
    customer: any;
    lineItems: { name: string; value: number; loading?: boolean; tip?: any }[];
    totalAmount: number;
    subtotal: number;
    serviceQuote: any;
    deliveryLocation: any;
    isServiceQuoteUnavailable: boolean;
    isPickup: boolean;
    isPickupEnabled: boolean;
    setPickup: (pickup: number | boolean) => void;
    setTipOptions: (options: Record<string, any>) => void;
    handleDeliveryLocationChange: (place: any) => void;
    orderNotes: string;
    setOrderNotes: (notes: string) => void;
    isBelowMinimum: boolean;
    minimumCheckoutAmount: number;
    isLoading: boolean;
    isNotReady: boolean;
};

export type CheckoutLayoutProps = {
    checkout: CheckoutState;
    /** The gateway's payment method picker; shown once the customer is signed in. */
    payment: React.ReactNode;
    /** Gateway-specific fields, such as QPay's VAT receipt type. */
    extra?: React.ReactNode;
    /** Whether the gateway has what it needs to charge (e.g. a card is chosen). */
    paymentReady: boolean;
    onPlaceOrder: () => void;
    /** Distance from the bottom for the sticky footer (tab bar or safe area). */
    footerOffset: number;
    children?: React.ReactNode;
};

/**
 * Checkout, shared by every payment gateway: delivery or pickup, the address and its
 * delivery quote, tips, payment, notes and an order summary with promotions. The place
 * order button says what's missing when it's disabled.
 */
export default function CheckoutLayout({ checkout, payment, extra, paymentReady, onPlaceOrder, footerOffset, children }: CheckoutLayoutProps) {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t, locale } = useLanguage();
    const { isAuthenticated } = useAuth();
    const { info, enabled } = useStorefrontInfo();
    const { mode, getSelectedStoreLocation } = useStorefrontRuntime();
    const { savedLocations } = useSavedLocations();
    const [addressSheet, setAddressSheet] = useState(false);
    const { cart, isPickup } = checkout;
    const currency = cart?.getAttribute?.('currency') ?? info?.currency ?? 'USD';
    const money = (amount: number) => formatCurrency(amount, currency);
    const quoteId = checkout.serviceQuote?.id ?? checkout.serviceQuote?.getAttribute?.('id') ?? null;
    const promo = useCartPromotions({ pickup: isPickup, serviceQuoteId: quoteId });
    const groups = useMemo(() => cartGroups(cart?.contents?.() ?? []), [cart]);
    // Pickup is each store's own setting: in a network the cart's (single) store decides.
    const cartPickup = useCartPickup(groups.map((group) => group.storeId));
    const pickupAvailable = mode === 'network' ? cartPickup === true : checkout.isPickupEnabled;
    // A cart that cannot be collected goes back to delivery (e.g. a second store was added).
    useEffect(() => {
        if (isPickup && mode === 'network' && cartPickup === false) checkout.setPickup(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cartPickup, isPickup, mode]);
    const itemCount = groups.reduce((sum, group) => sum + group.itemCount, 0);
    const hour12 = usesTwelveHourClock(locale);
    const bookings = groups.flatMap((group) => group.lines.filter((line) => line.scheduledAt).map((line) => ({ line, group, at: parseScheduledAt(line.scheduledAt) })));
    // A store's products come with its earliest appointment: that booking says so.
    const carriesItems = new Set(
        groups
            .filter((group) => group.lines.some((line) => line.scheduledAt) && group.lines.some((line) => !line.scheduledAt))
            .map((group) => {
                const earliest = bookings
                    .filter((booking) => booking.group === group && booking.at)
                    .sort((a, b) => (a.at as any).at.getTime() - (b.at as any).at.getTime())[0];
                return earliest?.line.id;
            })
            .filter(Boolean)
    );
    const changeBooking = (line: any) => {
        const item = (cart?.contents?.() ?? []).find((entry: any) => entry.id === line.id);
        const params = { productId: line.productId, storeId: line.storeId, cartLineId: line.id, cartItem: item, scheduledAt: line.scheduledAt, quantity: line.quantity };
        if (mode === 'network') navigation.navigate('NetworkHomeTab', { screen: 'Product', params });
        else navigation.goBack();
    };

    const location = checkout.deliveryLocation;
    // One origin per store in the cart, for the route preview.
    const routeStores: RouteStore[] = useMemo(
        () =>
            groups.flatMap((group) => {
                const storeLocationId = group.lines.find((line) => line.storeLocationId)?.storeLocationId;
                return group.storeId && storeLocationId ? [{ storeId: group.storeId, storeLocationId, name: group.name }] : [];
            }),
        [groups]
    );
    const placeAttr = (key: string) => (typeof location?.getAttribute === 'function' ? location.getAttribute(key) : location?.[key]);
    const quoteAmount = checkout.serviceQuote ? Number(checkout.serviceQuote.getAttribute?.('amount') ?? checkout.serviceQuote.amount ?? 0) : null;
    const quoteState: 'none' | 'loading' | 'ready' | 'unavailable' = isPickup
        ? 'none'
        : checkout.isServiceQuoteUnavailable
          ? 'unavailable'
          : checkout.serviceQuote
            ? 'ready'
            : location
              ? 'loading'
              : 'none';
    const discount = promo.promotions.discount;
    const total = Math.max(0, checkout.totalAmount - discount);

    const tipsEnabled = enabled('tips');
    const driverTipsEnabled = enabled('delivery_tips') && !isPickup;

    const blockedReason = !isAuthenticated
        ? null
        : !isPickup && !location
          ? t('Checkout.blockedAddress')
          : quoteState === 'unavailable'
            ? t('Checkout.blockedDelivery')
            : checkout.isBelowMinimum
              ? t('Checkout.blockedMinimum', { amount: money(checkout.minimumCheckoutAmount) })
              : !paymentReady
                ? t('Checkout.blockedPayment')
                : checkout.isNotReady && !checkout.isLoading
                  ? t('Checkout.preparing')
                  : null;

    // Sign in on the account tab, then come straight back to this checkout.
    const signIn = () => {
        const tabs = navigation.getParent()?.getState?.();
        const tab = tabs?.routes?.[tabs.index]?.name;
        const redirect = tab ? { route: tab, params: { screen: route.name, params: route.params } } : null;
        navigation.navigate(mode === 'network' ? 'NetworkProfileTab' : 'StoreProfileTab', { screen: 'Login', params: { redirectTo: 'checkout', redirect } });
    };

    const summaryRows = checkout.lineItems.filter((item) => item.name !== t('lineItems.total'));

    return (
        <YStack flex={1} backgroundColor='$surface'>
            {/* The scroll view clears the keyboard itself (automaticallyAdjustKeyboardInsets) and
                scrolls the focused field into view; padding here as well would double it. */}
            <KeyboardAvoidingView style={{ flex: 1 }} enabled={false}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: insets.top + 4, paddingBottom: 160 }}
                    keyboardShouldPersistTaps='handled'
                    keyboardDismissMode='interactive'
                    automaticallyAdjustKeyboardInsets
                >
                    <XStack alignItems='center' gap={8} paddingHorizontal={8} paddingBottom={12}>
                        <IconButton icon={faChevronLeft} variant='plain' size={44} accessibilityLabel={t('Checkout.backToCart')} onPress={() => navigation.goBack()} />
                        <UIText variant='heading' accessibilityRole='header'>
                            {t('Checkout.title')}
                        </UIText>
                    </XStack>

                    <YStack gap={12} paddingHorizontal={space.gutter}>
                        {pickupAvailable && (
                            <SegmentedControl
                                accessibilityLabel={t('Checkout.fulfilment')}
                                value={isPickup ? 'pickup' : 'delivery'}
                                onChange={(value) => checkout.setPickup(value === 'pickup' ? 1 : 0)}
                                options={[
                                    { value: 'delivery', label: t('Checkout.delivery') },
                                    { value: 'pickup', label: t('Checkout.pickup') },
                                ]}
                            />
                        )}

                        {!isPickup ? (
                            <Card padding={14} gap={12} accessibilityLabel={t('Checkout.deliveryAddress')}>
                                {!!location && (
                                    <YStack marginTop={-14} marginHorizontal={-14}>
                                        <RoutePreview stores={routeStores} destination={location} unavailable={quoteState === 'unavailable'} onPress={() => setAddressSheet(true)} />
                                    </YStack>
                                )}
                                <XStack gap={12} alignItems='flex-start'>
                                    <YStack width={40} height={40} borderRadius={radius.pill} backgroundColor='$primarySoft' alignItems='center' justifyContent='center'>
                                        <FontAwesomeIcon icon={faLocationDot} size={18} color={theme.primaryForeground.val} />
                                    </YStack>
                                    <YStack flex={1} gap={2}>
                                        <UIText variant='bodyStrong'>
                                            {location ? placeAttr('name') || placeAttr('street1') || t('Checkout.deliveryAddress') : t('Checkout.noAddress')}
                                        </UIText>
                                        {!!location && (
                                            <UIText variant='caption' tone='secondary'>
                                                {[placeAttr('street1'), placeAttr('street2'), placeAttr('city'), placeAttr('postal_code')].filter(Boolean).join(', ')}
                                            </UIText>
                                        )}
                                    </YStack>
                                    <Button variant='ghost' size='sm' onPress={() => setAddressSheet(true)}>
                                        {location ? t('Checkout.change') : t('Checkout.addAddress')}
                                    </Button>
                                </XStack>
                                {quoteState === 'loading' && (
                                    <XStack justifyContent='space-between' alignItems='center' paddingTop={12} borderTopWidth={1} borderColor='$borderColor'>
                                        <UIText variant='bodyStrong'>{t('Checkout.deliveryFee')}</UIText>
                                        <Skeleton width={60} height={16} />
                                    </XStack>
                                )}
                                {quoteState === 'ready' && (
                                    <XStack justifyContent='space-between' alignItems='center' paddingTop={12} borderTopWidth={1} borderColor='$borderColor'>
                                        <YStack>
                                            <UIText variant='bodyStrong'>{t('Checkout.deliveryFee')}</UIText>
                                            {groups.length > 1 && (
                                                <UIText variant='caption' tone='secondary'>
                                                    {t('Checkout.feeCoversStores', { count: groups.length })}
                                                </UIText>
                                            )}
                                        </YStack>
                                        <UIText variant='bodyStrong'>{promo.promotions.discountDelivery > 0 ? t('Checkout.free') : money(quoteAmount ?? 0)}</UIText>
                                    </XStack>
                                )}
                                {quoteState === 'unavailable' && (
                                    <YStack gap={10} padding={12} borderRadius={radius.button} backgroundColor='$errorSoft' accessibilityRole='alert'>
                                        <XStack gap={10}>
                                            <FontAwesomeIcon icon={faCircleExclamation} size={18} color={theme.errorForeground.val} />
                                            <UIText flex={1} variant='caption'>
                                                <UIText variant='captionStrong'>{t('Checkout.deliveryUnavailableTitle')} </UIText>
                                                {pickupAvailable ? t('Checkout.deliveryUnavailableBodyPickup') : t('Checkout.deliveryUnavailableBody')}
                                            </UIText>
                                        </XStack>
                                        <XStack gap={8}>
                                            <YStack flex={1}>
                                                <Button variant='outline' size='sm' fullWidth onPress={() => setAddressSheet(true)}>
                                                    {t('Checkout.changeAddress')}
                                                </Button>
                                            </YStack>
                                            {pickupAvailable && (
                                                <YStack flex={1}>
                                                    <Button variant='inverse' size='sm' fullWidth onPress={() => checkout.setPickup(1)}>
                                                        {t('Checkout.switchToPickup')}
                                                    </Button>
                                                </YStack>
                                            )}
                                        </XStack>
                                    </YStack>
                                )}
                            </Card>
                        ) : (
                            <Card padding={14} gap={12} accessibilityLabel={t('Checkout.pickupFrom')}>
                                <UIText variant='subheading'>{t('Checkout.pickupFrom')}</UIText>
                                {groups.map((group) => {
                                    const storeLocation = getSelectedStoreLocation(group.storeId);
                                    const address = storeLocation?.getAttribute?.('address') ?? storeLocation?.getAttribute?.('place.address') ?? null;
                                    return (
                                        <XStack key={group.storeId} gap={12} alignItems='center'>
                                            <StoreLogo uri={group.logoUrl} name={group.name ?? info?.name ?? '?'} size={36} radius={radius.tile} />
                                            <YStack flex={1}>
                                                <UIText variant='bodyStrong'>{group.name ?? info?.name}</UIText>
                                                {!!address && (
                                                    <UIText variant='caption' tone='secondary'>
                                                        {address}
                                                    </UIText>
                                                )}
                                            </YStack>
                                        </XStack>
                                    );
                                })}
                                <UIText variant='caption' tone='secondary'>
                                    {t('Checkout.pickupNotice')}
                                </UIText>
                            </Card>
                        )}

                        {bookings.map(({ line, group, at }) => (
                            <Card key={line.id} padding={14} gap={10} accessibilityLabel={t('Checkout.yourBooking')}>
                                <XStack gap={12} alignItems='center'>
                                    <StoreLogo uri={group.logoUrl} name={group.name ?? info?.name ?? '?'} size={40} radius={radius.tile} />
                                    <YStack flex={1}>
                                        <UIText variant='bodyStrong'>{line.name}</UIText>
                                        <UIText variant='caption' tone='secondary'>
                                            {group.name ?? info?.name}
                                        </UIText>
                                    </YStack>
                                    <Button variant='ghost' size='sm' onPress={() => changeBooking(line)}>
                                        {t('Checkout.change')}
                                    </Button>
                                </XStack>
                                {!!at && (
                                    <XStack alignItems='center' gap={10} paddingHorizontal={12} paddingVertical={10} borderRadius={radius.button} backgroundColor='$primarySoft'>
                                        <FontAwesomeIcon icon={faCalendarDays} size={16} color={theme.primaryForeground.val} />
                                        <UIText variant='captionStrong' tone='brand' style={{ fontSize: 14 }}>
                                            {at.at.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })} · {formatClock(at.minutes, hour12)}
                                        </UIText>
                                    </XStack>
                                )}
                                <UIText variant='caption' tone='secondary'>
                                    {isPickup ? t('Checkout.bookingNotePickup', { store: group.name ?? info?.name ?? '' }) : t('Checkout.bookingNote')}
                                </UIText>
                                {carriesItems.has(line.id) && (
                                    <UIText variant='caption' tone='brand'>
                                        {isPickup ? t('Checkout.itemsAtAppointment') : t('Checkout.itemsWithAppointment')}
                                    </UIText>
                                )}
                            </Card>
                        ))}

                        {(tipsEnabled || driverTipsEnabled) && (
                            <Card padding={14} gap={14}>
                                {driverTipsEnabled && (
                                    <TipSelector
                                        title={t('Checkout.tipDriver')}
                                        note={t('Checkout.tipDriverNote')}
                                        subtotal={checkout.subtotal}
                                        currency={currency}
                                        onChange={(tip) => checkout.setTipOptions({ leavingDeliveryTip: tip !== 0, deliveryTip: tip })}
                                    />
                                )}
                                {tipsEnabled && (
                                    <TipSelector
                                        title={t('Checkout.tipStore')}
                                        subtotal={checkout.subtotal}
                                        currency={currency}
                                        onChange={(tip) => checkout.setTipOptions({ leavingTip: tip !== 0, tip })}
                                    />
                                )}
                            </Card>
                        )}

                        {isAuthenticated ? (
                            <Card padding={14} gap={8} accessibilityLabel={t('Checkout.payment')}>
                                <UIText variant='subheading'>{t('Checkout.payment')}</UIText>
                                {/* Payment is set up for a delivery quote; without one it would wait forever. */}
                                {quoteState === 'unavailable' ? <UIText tone='secondary'>{t('Checkout.paymentNeedsAddress')}</UIText> : payment}
                            </Card>
                        ) : (
                            <Card padding={14} gap={10}>
                                <XStack gap={12} alignItems='center'>
                                    <FontAwesomeIcon icon={faLock} size={18} color={theme.textSecondary.val} />
                                    <UIText flex={1} tone='secondary'>
                                        {t('Checkout.signInBody')}
                                    </UIText>
                                </XStack>
                                <Button variant='outline' fullWidth onPress={signIn}>
                                    {t('Checkout.signIn')}
                                </Button>
                            </Card>
                        )}

                        {extra}

                        <Card padding={14} gap={8} accessibilityLabel={t('Checkout.summary')}>
                            <UIText variant='subheading' style={{ marginBottom: 4 }}>
                                {t('Checkout.summary')}
                            </UIText>
                            {summaryRows.map((row) => {
                                const isFee = row.name === t('lineItems.serviceFee');
                                const label =
                                    row.name === t('lineItems.cartSubtotal')
                                        ? t('Checkout.subtotalItems', { items: t('UI.itemsCount', { count: itemCount }) })
                                        : isFee
                                          ? t('Checkout.deliveryFee')
                                          : row.name;
                                return (
                                    <XStack key={row.name} justifyContent='space-between'>
                                        <UIText tone='secondary'>{label}</UIText>
                                        {row.loading ? (
                                            <Skeleton width={50} height={14} />
                                        ) : isFee && quoteState === 'unavailable' ? (
                                            <UIText tone='warning'>{t('Checkout.unavailable')}</UIText>
                                        ) : (
                                            <UIText>{money(row.value)}</UIText>
                                        )}
                                    </XStack>
                                );
                            })}
                            {promo.promotions.applied.map((applied) => (
                                <XStack key={`${applied.promotionId}-${applied.code}`} justifyContent='space-between'>
                                    <UIText tone='success'>{applied.code ?? applied.name}</UIText>
                                    <UIText tone='success'>−{money(applied.amount + applied.deliveryAmount)}</UIText>
                                </XStack>
                            ))}
                            <XStack justifyContent='space-between' paddingTop={10} marginTop={2} borderTopWidth={1} borderColor='$borderColor'>
                                <UIText variant='subheading'>{t('Checkout.total')}</UIText>
                                <UIText variant='subheading'>{money(total)}</UIText>
                            </XStack>
                        </Card>

                        <YStack gap={6}>
                            <UIText variant='captionStrong'>{t('Checkout.notesLabel')}</UIText>
                            <TextField
                                value={checkout.orderNotes ?? ''}
                                onChangeText={checkout.setOrderNotes}
                                placeholder={t('Checkout.notesPlaceholder')}
                                accessibilityLabel={t('Checkout.notesLabel')}
                                multiline
                                height={96}
                                textAlignVertical='top'
                                maxLength={500}
                            />
                        </YStack>
                        {children}
                    </YStack>
                </ScrollView>
            </KeyboardAvoidingView>

            <YStack
                position='absolute'
                left={0}
                right={0}
                bottom={footerOffset}
                paddingHorizontal={space.gutter}
                paddingTop={12}
                paddingBottom={12}
                gap={6}
                backgroundColor='$background'
                borderTopWidth={1}
                borderColor='$borderColor'
                style={elevation.floating}
            >
                {!isAuthenticated ? (
                    <Button size='lg' fullWidth icon={faLock} onPress={signIn}>
                        {t('Checkout.signInToPlace')}
                    </Button>
                ) : checkout.pendingCapture ? (
                    // Paid, but the order wasn't created: finish it without charging again.
                    <>
                        <YStack gap={2} accessibilityRole='alert'>
                            <UIText variant='captionStrong' textAlign='center'>
                                {t('Checkout.paidPendingTitle')}
                            </UIText>
                            <UIText variant='caption' tone='secondary' textAlign='center'>
                                {t('Checkout.paidPendingBody')}
                            </UIText>
                        </YStack>
                        <Button size='lg' fullWidth loading={checkout.isLoading} onPress={onPlaceOrder}>
                            {t('Checkout.finishOrder')}
                        </Button>
                    </>
                ) : (
                    <>
                        {!!blockedReason && (
                            <UIText variant='captionStrong' tone='warning' textAlign='center' accessibilityRole='alert'>
                                {blockedReason}
                            </UIText>
                        )}
                        <Button size='lg' fullWidth disabled={!!blockedReason || checkout.isNotReady} loading={checkout.isLoading} onPress={onPlaceOrder} trailing={money(total)}>
                            {t('Checkout.placeOrder')}
                        </Button>
                    </>
                )}
            </YStack>

            <LocationSheet
                open={addressSheet}
                onClose={() => setAddressSheet(false)}
                savedLocations={savedLocations}
                current={location}
                onSelect={(place: any) => {
                    checkout.handleDeliveryLocationChange(place);
                    setAddressSheet(false);
                }}
                note={t('Places.quoteNote')}
            />
        </YStack>
    );
}
