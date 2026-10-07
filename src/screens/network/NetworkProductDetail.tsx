import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { Product, Store } from '@fleetbase/storefront';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCalendarCheck, faCalendarDays, faCheck, faChevronRight, faHouse, faXmark } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import useCart from '../../hooks/use-cart';
import useStorefront from '../../hooks/use-storefront';
import useCurrentLocation from '../../hooks/use-current-location';
import useSavedLocations from '../../hooks/use-saved-locations';
import BookingPicker from '../../components/booking/BookingPicker';
import { parseScheduledAt, serviceDuration } from '../../commerce/booking';
import { toast } from '../../utils/toast';
import { formatCurrency } from '../../utils/format';
import {
    Badge,
    Button,
    IconButton,
    LocationSheet,
    MediaImage,
    Stepper,
    StoreLogo,
    UIText,
    canChoose,
    cartOptions,
    missingGroups,
    optionGroups,
    productSummary,
    formatClock,
    radius,
    selectionFromCartItem,
    space,
    storeHours,
    storeSummary,
    toggleOption,
    unitPrice,
    usesTwelveHourClock,
    type OptionGroup,
    type OptionSelection,
} from '../../ui';

const GALLERY_HEIGHT = 280;

/**
 * Product detail inside a Network: gallery, price, "Sold by" attribution, option groups
 * with required and limit hints, quantity and a sticky add button that explains why it
 * is disabled.
 */
export default function NetworkProductDetail({ params }: { params: any }) {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { width } = useWindowDimensions();
    const { t, locale } = useLanguage();
    const { adapter } = useStorefront();
    const [cart, updateCart, , addProduct] = useCart();
    const { currentLocation, updateCurrentLocation } = useCurrentLocation();
    const { savedLocations } = useSavedLocations();
    const [addressSheet, setAddressSheet] = useState(false);
    const product = useMemo(() => new Product(params.product, adapter), [adapter, params.product]);
    const merchant = useMemo(() => (params.store ? new Store(params.store, adapter) : null), [adapter, params.store]);
    const summary = useMemo(() => productSummary(product), [product]);
    const store = useMemo(() => (params.store ? storeSummary(params.store, { t }) : null), [params.store, t]);
    const groups = useMemo<OptionGroup[]>(() => optionGroups(product.getAttribute('variants'), product.getAttribute('addon_categories')), [product]);
    const [selection, setSelection] = useState<OptionSelection>(() => (params.cartItem ? selectionFromCartItem(groups, params.cartItem) : {}));
    const [quantity, setQuantity] = useState<number>(params.quantity ?? 1);
    const [adding, setAdding] = useState(false);
    const [page, setPage] = useState(0);
    const [scheduledAt, setScheduledAt] = useState<string | null>(params.scheduledAt ?? null);
    const editingLineId: string | null = params.cartLineId ?? null;

    const images: string[] = useMemo(() => {
        const list = (product.getAttribute('images') ?? []).filter((url: unknown): url is string => typeof url === 'string');
        return summary.imageUrl && !list.includes(summary.imageUrl) ? [summary.imageUrl, ...list] : list;
    }, [product, summary.imageUrl]);

    const base = summary.onSale && summary.salePrice !== null ? summary.salePrice : summary.price;
    const total = unitPrice(base, groups, selection) * quantity;
    const missing = missingGroups(groups, selection);
    const hasOptionCosts = groups.some((group) => group.options.some((option) => option.price > 0));
    const currency = summary.currency ?? 'USD';
    const isBooking = summary.isBookable;
    const duration = useMemo(() => serviceDuration(product), [product]);
    const bookingHours = useMemo(() => {
        const own = product.getAttribute('hours');
        return Array.isArray(own) && own.length > 0 ? own : storeHours(params.store);
    }, [params.store, product]);
    const hour12 = usesTwelveHourClock(locale);
    const scheduled = parseScheduledAt(scheduledAt);
    const scheduledText = scheduled
        ? `${scheduled.at.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatClock(scheduled.minutes, hour12)}${duration ? ` – ${formatClock(scheduled.minutes + duration, hour12)}` : ''}`
        : null;
    const placeAttr = (key: string) => (typeof currentLocation?.getAttribute === 'function' ? currentLocation.getAttribute(key) : currentLocation?.[key]);

    const blockedReason = !summary.available
        ? t('ProductDetail.unavailable')
        : store?.status.state === 'offline'
          ? t('ProductDetail.storeClosed')
          : missing.length > 0
            ? t('ProductDetail.chooseRequired', { groups: missing.map((group) => group.name.toLowerCase()).join(t('ProductDetail.and')) })
            : isBooking && !scheduledAt
              ? t('Booking.chooseToContinue')
              : null;

    const add = async () => {
        if (blockedReason || adding) return;
        setAdding(true);
        try {
            const { variants, addons } = cartOptions(groups, selection);
            const booking = isBooking ? { scheduled_at: scheduledAt } : {};
            if (editingLineId && cart) {
                updateCart(await cart.update(editingLineId, quantity, { variants, addons, ...booking }));
                toast.success(t('Booking.updated'));
            } else {
                await addProduct(product, isBooking ? 1 : quantity, { variants, addons, store_location: params.storeLocationId ?? null, ...booking }, merchant);
                toast.success(isBooking ? t('Booking.added', { name: summary.name }) : t('ProductScreen.productAddedToCart', { productName: summary.name }));
            }
            navigation.goBack();
        } catch (error: any) {
            if (error?.message !== 'CART_REPLACEMENT_CANCELLED') toast.error(error?.message || t('Network.addToCartError'));
        } finally {
            setAdding(false);
        }
    };

    return (
        <YStack flex={1} backgroundColor='$background'>
            <ScrollView contentContainerStyle={{ paddingBottom: 150 }} keyboardShouldPersistTaps='handled'>
                <YStack height={GALLERY_HEIGHT}>
                    {images.length > 1 ? (
                        <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / width))}
                            accessibilityLabel={t('ProductDetail.gallery', { name: summary.name })}
                        >
                            {images.map((uri) => (
                                <MediaImage key={uri} uri={uri} seed={summary.name} width={width} height={GALLERY_HEIGHT} radius={0} />
                            ))}
                        </ScrollView>
                    ) : (
                        <MediaImage uri={images[0] ?? null} seed={summary.name} height={GALLERY_HEIGHT} radius={0} />
                    )}
                    {images.length > 1 && (
                        <YStack position='absolute' right={12} bottom={12}>
                            <Badge tone='scrim' label={`${page + 1} / ${images.length}`} />
                        </YStack>
                    )}
                </YStack>

                <YStack paddingHorizontal={space.gutter} paddingTop={18} gap={10}>
                    {isBooking && (
                        <XStack>
                            <Badge tone='brand' icon={faCalendarCheck} label={t('Booking.bookableService')} />
                        </XStack>
                    )}
                    <UIText variant='title' accessibilityRole='header'>
                        {summary.name}
                    </UIText>
                    <XStack gap={8} alignItems='baseline'>
                        <UIText variant='subheading' tone={summary.onSale ? 'error' : 'primary'} style={{ fontSize: 18 }}>
                            {hasOptionCosts ? t('ProductDetail.from', { price: formatCurrency(base, currency) }) : formatCurrency(base, currency)}
                        </UIText>
                        {summary.onSale && (
                            <UIText tone='secondary' style={{ textDecorationLine: 'line-through' }}>
                                {formatCurrency(summary.price, currency)}
                            </UIText>
                        )}
                    </XStack>
                    {!!summary.description && <UIText tone='secondary'>{summary.description}</UIText>}
                    {store && (
                        <Pressable
                            onPress={() => navigation.navigate('NetworkStore', { storeId: store.id })}
                            accessibilityRole='link'
                            style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.card, backgroundColor: theme.surface.val }}
                        >
                            <StoreLogo uri={store.logoUrl} name={store.name} size={32} radius={8} />
                            <UIText flex={1} variant='caption'>
                                <UIText variant='caption' tone='secondary'>
                                    {isBooking ? t('Booking.providedBy') : t('ProductDetail.soldBy')}{' '}
                                </UIText>
                                <UIText variant='captionStrong'>{store.name}</UIText>
                            </UIText>
                            <FontAwesomeIcon icon={faChevronRight} size={14} color={theme.textSecondary.val} />
                        </Pressable>
                    )}
                </YStack>

                {groups.map((group) => (
                    <OptionGroupView key={group.id} group={group} selection={selection} currency={currency} onToggle={(optionId) => setSelection((current) => toggleOption(groups, current, group.id, optionId))} />
                ))}

                {isBooking && (
                    <YStack marginTop={24} gap={22}>
                        <BookingPicker hours={bookingHours} duration={duration} value={scheduledAt} onChange={setScheduledAt} providerName={store?.name ?? ''} />
                        <XStack marginHorizontal={space.gutter} alignItems='center' gap={12} padding={12} borderRadius={radius.card} borderWidth={1} borderColor='$borderColor' accessibilityLabel={t('Booking.serviceAddress')}>
                            <YStack width={40} height={40} borderRadius={20} backgroundColor='$primarySoft' alignItems='center' justifyContent='center'>
                                <FontAwesomeIcon icon={faHouse} size={17} color={theme.primaryForeground.val} />
                            </YStack>
                            <YStack flex={1} gap={2}>
                                <UIText variant='captionStrong' tone='secondary'>
                                    {t('Booking.comesTo')}
                                </UIText>
                                <UIText variant='bodyStrong' style={{ fontSize: 14 }} numberOfLines={2}>
                                    {currentLocation ? [placeAttr('name'), placeAttr('street1')].filter(Boolean).join(' · ') : t('Booking.noAddress')}
                                </UIText>
                            </YStack>
                            <Button variant='ghost' size='sm' onPress={() => (savedLocations?.length ? setAddressSheet(true) : navigation.navigate('LocationPicker', { redirectTo: 'NetworkNavigator' }))}>
                                {currentLocation ? t('Checkout.change') : t('Checkout.addAddress')}
                            </Button>
                        </XStack>
                    </YStack>
                )}
            </ScrollView>

            <YStack position='absolute' top={insets.top + 10} left={space.gutter}>
                <IconButton icon={faXmark} variant='floating' accessibilityLabel={t('UI.close')} onPress={() => navigation.goBack()} />
            </YStack>

            <YStack position='absolute' left={0} right={0} bottom={0} paddingHorizontal={space.gutter} paddingTop={12} paddingBottom={insets.bottom + 16} gap={8} backgroundColor='$background' borderTopWidth={1} borderColor='$borderColor'>
                {!!blockedReason && (
                    <UIText variant='captionStrong' tone='warning' textAlign='center' accessibilityRole='alert'>
                        {blockedReason}
                    </UIText>
                )}
                {isBooking && !!scheduledText && !blockedReason && (
                    <XStack alignItems='center' gap={8}>
                        <FontAwesomeIcon icon={faCalendarDays} size={16} color={theme.primaryForeground.val} />
                        <UIText variant='captionStrong' tone='brand' style={{ fontSize: 14 }}>
                            {scheduledText}
                        </UIText>
                    </XStack>
                )}
                <XStack gap={12} alignItems='center'>
                    {!isBooking && !editingLineId && <Stepper value={quantity} onChange={setQuantity} min={1} max={99} itemName={summary.name} />}
                    <YStack flex={1}>
                        <Button size='lg' fullWidth disabled={!!blockedReason} loading={adding} onPress={add} trailing={formatCurrency(isBooking ? unitPrice(base, groups, selection) : total, currency)}>
                            {editingLineId ? t('Booking.saveChanges') : isBooking ? t('Booking.addToCart') : t('ProductDetail.addToCart')}
                        </Button>
                    </YStack>
                </XStack>
            </YStack>
            <LocationSheet
                open={addressSheet}
                onClose={() => setAddressSheet(false)}
                savedLocations={savedLocations}
                currentId={currentLocation?.id}
                onSelect={(place: any) => {
                    updateCurrentLocation(place);
                    setAddressSheet(false);
                }}
                onAdd={() => {
                    setAddressSheet(false);
                    navigation.navigate('LocationPicker', { redirectTo: 'NetworkNavigator' });
                }}
            />
        </YStack>
    );
}

function OptionGroupView({ group, selection, currency, onToggle }: { group: OptionGroup; selection: OptionSelection; currency: string; onToggle: (optionId: string) => void }) {
    const { t } = useLanguage();
    const theme = useTheme();
    const chosen = selection[group.id] ?? [];
    const done = chosen.length > 0;
    const hint = !group.multiple ? t('ProductDetail.chooseOne') : group.max ? t('ProductDetail.chooseUpTo', { count: group.max }) : t('ProductDetail.chooseAny');

    return (
        <YStack paddingHorizontal={space.gutter} paddingTop={22} accessibilityRole={group.multiple ? 'list' : 'radiogroup'} accessibilityLabel={group.name}>
            <XStack alignItems='center' justifyContent='space-between' gap={8}>
                <YStack flex={1}>
                    <UIText variant='subheading' style={{ fontSize: 17 }}>
                        {group.name}
                    </UIText>
                    <UIText variant='caption' tone='secondary'>
                        {hint}
                    </UIText>
                </YStack>
                <Badge tone={group.required ? (done ? 'success' : 'warning') : 'neutral'} label={group.required ? (done ? t('UI.done') : t('UI.required')) : t('UI.optional')} />
            </XStack>
            <YStack marginTop={6}>
                {group.options.map((option) => {
                    const selected = chosen.includes(option.id);
                    const enabled = canChoose(group, selection, option.id);
                    return (
                        <Pressable
                            key={option.id}
                            onPress={() => enabled && onToggle(option.id)}
                            accessibilityRole={group.multiple ? 'checkbox' : 'radio'}
                            accessibilityState={{ checked: selected, disabled: !enabled }}
                            style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: theme.borderColor.val, opacity: enabled ? 1 : 0.45 }}
                        >
                            <YStack
                                width={22}
                                height={22}
                                borderRadius={group.multiple ? 6 : 11}
                                borderWidth={2}
                                borderColor={selected ? '$primary' : '$borderColorWithShadow'}
                                backgroundColor={selected ? '$primary' : 'transparent'}
                                alignItems='center'
                                justifyContent='center'
                            >
                                {selected && <FontAwesomeIcon icon={faCheck} size={12} color={theme.primaryText.val} />}
                            </YStack>
                            <YStack flex={1}>
                                <UIText variant='body' style={{ fontWeight: '600' }}>
                                    {option.name}
                                </UIText>
                                {!!option.description && (
                                    <UIText variant='caption' tone='secondary'>
                                        {option.description}
                                    </UIText>
                                )}
                            </YStack>
                            {option.price > 0 && (
                                <UIText variant='captionStrong' tone='secondary'>
                                    +{formatCurrency(option.price, currency)}
                                </UIText>
                            )}
                        </Pressable>
                    );
                })}
            </YStack>
        </YStack>
    );
}
