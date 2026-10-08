import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faChevronLeft, faChevronRight, faClock } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useStorefront from '../../hooks/use-storefront';
import useCart from '../../hooks/use-cart';
import useCartPromotions from '../../hooks/use-cart-promotions';
import { describeSchedule, fetchOffer, offerBadge, offerStoreId, type Offer } from '../../commerce/offers';
import { formatCurrency } from '../../utils/format';
import { toast } from '../../utils/toast';
import { Button, ErrorState, IconButton, MediaImage, Skeleton, StoreLogo, UIText, elevation, formatClock, radius, space, usesTwelveHourClock } from '../../ui';
import useFooterOffset from '../../hooks/use-footer-offset';

const HERO = 220;

/** Monday 5 October 2026 gives ISO weekday names in the viewer's locale. */
const MONDAY = new Date(2026, 9, 5);

/**
 * One offer: what it is, who runs it, how to use it (a code to apply, or automatic) and
 * its terms. Offers outside their weekly hours say when they start again; ended offers
 * say so and point to current ones.
 */
const OfferDetailScreen = ({ route }: any) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    // Above the tab bar, which already clears the home indicator.
    const footerOffset = useFooterOffset(false);
    const theme = useTheme();
    const { t, locale } = useLanguage();
    const { storefront } = useStorefront();
    const { mode } = useStorefrontRuntime();
    const [cart] = useCart();
    const promo = useCartPromotions();
    const hour12 = usesTwelveHourClock(locale);
    const offerId: string = route?.params?.offerId;
    const [offer, setOffer] = useState<Offer | null>(null);
    const [error, setError] = useState(false);
    const [copied, setCopied] = useState(false);
    const now = useMemo(() => new Date(), [offer]); // eslint-disable-line react-hooks/exhaustive-deps

    const load = useCallback(() => {
        const adapter = storefront?.getAdapter?.();
        if (!adapter || !offerId) return;
        setError(false);
        fetchOffer((path, query) => adapter.get(path, query), offerId)
            .then(setOffer)
            .catch(() => setError(true));
    }, [offerId, storefront]);

    useEffect(() => {
        load();
    }, [load]);

    if (error || !offerId) {
        return (
            <YStack flex={1} justifyContent='center' backgroundColor='$background'>
                <ErrorState title={t('Offers.notFound')} onRetry={offerId ? load : undefined} />
                <YStack alignItems='center'>
                    <Button variant='outline' onPress={() => navigation.goBack()}>
                        {t('common.goBack')}
                    </Button>
                </YStack>
            </YStack>
        );
    }

    if (!offer) {
        return (
            <YStack flex={1} backgroundColor='$background' gap={14}>
                <Skeleton height={HERO + insets.top} radius={0} />
                <YStack paddingHorizontal={space.gutter} gap={10}>
                    <Skeleton height={26} width='70%' />
                    <Skeleton height={14} width='90%' />
                    <Skeleton height={52} radius={radius.card} />
                </YStack>
            </YStack>
        );
    }

    const money = (amount: number) => formatCurrency(amount, offer.currency ?? cart?.getAttribute?.('currency') ?? 'USD');
    const ended = offer.availability === 'ended' || offer.availability === 'inactive';
    const scheduled = offer.availability === 'scheduled';
    const storeId = offerStoreId(offer);
    const time = (minutes: number) => formatClock(minutes, hour12);
    const dayName = (iso: number) => new Date(MONDAY.getFullYear(), MONDAY.getMonth(), MONDAY.getDate() + iso - 1).toLocaleDateString(locale, { weekday: 'short' });
    const nextStart = offer.nextStartsAt ? new Date(offer.nextStartsAt) : null;
    const cartHasItems = (cart?.contents?.() ?? []).length > 0;
    const applied = !!offer.code && promo.codes.includes(offer.code);

    const banner = ended
        ? t('Offers.endedOn', { date: offer.endsAt ? new Date(offer.endsAt).toLocaleDateString(locale, { day: 'numeric', month: 'long' }) : '' })
        : scheduled && nextStart
          ? t('Offers.startsAgain', {
                when: `${nextStart.toDateString() === now.toDateString() ? t('Offers.today') : nextStart.toLocaleDateString(locale, { weekday: 'long' })} ${time(nextStart.getHours() * 60 + nextStart.getMinutes())}`,
            })
          : null;

    const discount =
        offer.type === 'percentage'
            ? offer.maxDiscount
                ? t('Offers.terms.percentUpTo', { percent: Math.round(offer.value), max: money(offer.maxDiscount) })
                : t('Offers.terms.percent', { percent: Math.round(offer.value) })
            : offer.type === 'fixed_amount'
              ? t('Offers.terms.amount', { amount: money(offer.value) })
              : offer.type === 'free_delivery'
                ? t('Offers.terms.freeDelivery')
                : t('Offers.terms.bogo', { buy: offer.bogo?.buy ?? 1, get: offer.bogo?.get ?? 1 });
    const scope =
        offer.appliesTo.products.length || offer.appliesTo.categories.length
            ? t('Offers.terms.selectedItems')
            : offer.owner?.type === 'store'
              ? t('Offers.terms.everythingAt', { store: offer.owner.name })
              : offer.appliesTo.stores.length
                ? t('Offers.terms.selectedStores')
                : t('Offers.terms.anyStore');
    const terms = [
        { label: t('Offers.terms.discount'), value: discount },
        {
            label: t('Offers.terms.appliesTo'),
            value: scope + (offer.appliesTo.excludeProducts.length || offer.appliesTo.excludeCategories.length ? `. ${t('Offers.terms.someExcluded')}` : ''),
        },
        offer.schedule.length > 0 && { label: t('Offers.terms.when'), value: describeSchedule(offer.schedule, dayName, time, t('Offers.terms.everyDay')).join('; ') },
        (offer.minSubtotal || offer.minItems) && {
            label: t('Offers.terms.minimum'),
            value: [offer.minSubtotal ? t('Offers.terms.minSpend', { amount: money(offer.minSubtotal) }) : null, offer.minItems ? t('UI.itemsCount', { count: offer.minItems }) : null]
                .filter(Boolean)
                .join(', '),
        },
        offer.firstOrderOnly && { label: t('Offers.terms.who'), value: t('Offers.terms.firstOrder') },
        offer.perCustomerLimit && {
            label: t('Offers.terms.limit'),
            value: offer.perCustomerLimit === 1 ? t('Offers.terms.oncePerCustomer') : t('Offers.terms.timesPerCustomer', { count: offer.perCustomerLimit }),
        },
        offer.endsAt && { label: t('Offers.terms.validUntil'), value: new Date(offer.endsAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) },
        { label: t('Offers.terms.combines'), value: offer.stackable ? t('Offers.terms.stackable') : t('Offers.terms.notStackable') },
    ].filter(Boolean) as { label: string; value: string }[];

    // A store's offer opens that store; a network-wide one, every store. In the single-store
    // app it goes back to the store's home (navigate would not, since that route is below).
    const shop = () => {
        if (mode === 'network') navigation.navigate(storeId ? 'NetworkStore' : 'NetworkCategory', storeId ? { storeId } : {});
        else navigation.popTo('StoreHome');
    };
    const apply = async () => {
        if (!offer.code) return;
        if (await promo.apply(offer.code)) toast.success(t('Offers.applied', { code: offer.code }));
    };
    const copy = async () => {
        try {
            await (globalThis as any).navigator?.clipboard?.writeText(offer.code);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };
    const canCopy = Platform.OS === 'web' && typeof (globalThis as any).navigator?.clipboard?.writeText === 'function';

    return (
        <YStack flex={1} backgroundColor='$background'>
            <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
                <MediaImage uri={offer.imageUrl} seed={offer.name} height={HERO + insets.top} radius={0} dimmed={ended}>
                    <YStack
                        position='absolute'
                        left={space.gutter}
                        bottom={16}
                        paddingHorizontal={14}
                        paddingVertical={6}
                        borderRadius={radius.button}
                        backgroundColor={offer.type === 'free_delivery' ? '$success' : '$error'}
                        style={elevation.floating}
                    >
                        <UIText variant='title' style={{ color: '#ffffff' }}>
                            {offerBadge(offer, money, t('Offers.freeBadge'))}
                        </UIText>
                    </YStack>
                </MediaImage>

                <YStack paddingHorizontal={space.gutter} paddingTop={18} gap={12}>
                    {!!banner && (
                        <XStack gap={10} padding={12} borderRadius={radius.card} backgroundColor={ended ? '$surface' : '$warningSoft'} accessibilityRole='summary'>
                            <FontAwesomeIcon icon={faClock} size={18} color={ended ? theme.textSecondary.val : theme.warningForeground.val} />
                            <UIText flex={1} variant='caption'>
                                {banner}
                            </UIText>
                        </XStack>
                    )}
                    <UIText variant='title' accessibilityRole='header'>
                        {offer.name}
                    </UIText>
                    {!!offer.description && <UIText tone='secondary'>{offer.description}</UIText>}

                    {offer.owner && (
                        <Pressable
                            onPress={offer.owner.type === 'store' ? shop : undefined}
                            disabled={offer.owner.type !== 'store'}
                            accessibilityRole={offer.owner.type === 'store' ? 'link' : 'text'}
                            style={{
                                minHeight: 52,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                borderRadius: radius.card,
                                backgroundColor: theme.surface.val,
                            }}
                        >
                            <StoreLogo uri={offer.owner.logoUrl} name={offer.owner.name || '?'} size={32} radius={8} />
                            <UIText flex={1} variant='caption'>
                                <UIText variant='caption' tone='secondary'>
                                    {t('Offers.from')}{' '}
                                </UIText>
                                <UIText variant='captionStrong'>{offer.owner.name}</UIText>
                            </UIText>
                            {offer.owner.type === 'store' && <FontAwesomeIcon icon={faChevronRight} size={14} color={theme.textSecondary.val} />}
                        </Pressable>
                    )}

                    {!ended && (
                        <YStack padding={14} gap={10} borderRadius={radius.card} borderWidth={1} borderColor='$borderColor'>
                            <UIText variant='subheading'>{t('Offers.howToUse')}</UIText>
                            {offer.code ? (
                                <>
                                    <XStack gap={10} alignItems='center'>
                                        <YStack
                                            flex={1}
                                            height={48}
                                            borderRadius={radius.button}
                                            borderWidth={2}
                                            borderStyle='dashed'
                                            borderColor='$primary'
                                            backgroundColor='$primarySoft'
                                            alignItems='center'
                                            justifyContent='center'
                                        >
                                            <UIText variant='heading' tone='brand' style={{ letterSpacing: 1.5 }} selectable>
                                                {offer.code}
                                            </UIText>
                                        </YStack>
                                        {canCopy && (
                                            <Button variant='inverse' onPress={copy}>
                                                {copied ? t('Offers.copied') : t('Offers.copy')}
                                            </Button>
                                        )}
                                    </XStack>
                                    {cartHasItems ? (
                                        applied ? (
                                            <XStack gap={8} alignItems='center'>
                                                <FontAwesomeIcon icon={faCheck} size={14} color={theme.successForeground.val} />
                                                <UIText variant='captionStrong' tone='success'>
                                                    {t('Offers.inYourCart')}
                                                </UIText>
                                            </XStack>
                                        ) : (
                                            <Button variant='outline' fullWidth loading={promo.applying} onPress={apply}>
                                                {t('Offers.applyToCart')}
                                            </Button>
                                        )
                                    ) : (
                                        <UIText variant='caption' tone='secondary'>
                                            {t('Offers.enterAtCart')}
                                        </UIText>
                                    )}
                                    {!!promo.error && (
                                        <UIText variant='captionStrong' tone='error' accessibilityRole='alert'>
                                            {t(`Cart.promoErrors.${promo.error}`)}
                                        </UIText>
                                    )}
                                </>
                            ) : (
                                <XStack gap={10} alignItems='center'>
                                    <FontAwesomeIcon icon={faCheck} size={18} color={theme.successForeground.val} />
                                    <UIText flex={1} variant='captionStrong' style={{ fontSize: 14 }}>
                                        {t('Offers.noCodeNeeded')}
                                    </UIText>
                                </XStack>
                            )}
                        </YStack>
                    )}

                    <YStack accessibilityLabel={t('Offers.details')}>
                        <UIText variant='subheading' style={{ marginTop: 4, marginBottom: 6 }}>
                            {t('Offers.details')}
                        </UIText>
                        {terms.map((row) => (
                            <XStack key={row.label} gap={12} paddingVertical={10} borderBottomWidth={1} borderColor='$borderColor'>
                                <UIText tone='secondary' style={{ width: 110, fontSize: 14 }}>
                                    {row.label}
                                </UIText>
                                <UIText flex={1} variant='bodyStrong' style={{ fontSize: 14, fontWeight: '600' }}>
                                    {row.value}
                                </UIText>
                            </XStack>
                        ))}
                    </YStack>
                </YStack>
            </ScrollView>

            <YStack position='absolute' top={insets.top + 10} left={space.gutter}>
                <IconButton
                    icon={faChevronLeft}
                    variant='floating'
                    accessibilityLabel={t('UI.back')}
                    onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Offers'))}
                />
            </YStack>

            <YStack
                position='absolute'
                left={0}
                right={0}
                bottom={0}
                paddingHorizontal={space.gutter}
                paddingTop={12}
                paddingBottom={footerOffset + 12}
                backgroundColor='$background'
                borderTopWidth={1}
                borderColor='$borderColor'
            >
                {ended ? (
                    <Button variant='outline' size='lg' fullWidth onPress={() => navigation.navigate('Offers')}>
                        {t('Offers.seeCurrent')}
                    </Button>
                ) : (
                    <Button size='lg' fullWidth onPress={shop}>
                        {scheduled && offer.owner?.type === 'store' ? t('Offers.browse', { store: offer.owner.name }) : t('Offers.shop')}
                    </Button>
                )}
            </YStack>
        </YStack>
    );
};

export default OfferDetailScreen;
