import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Pressable, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faChevronLeft, faCircleInfo, faStar } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useReviewRequest from '../../hooks/use-review-request';
import { toast } from '../../utils/toast';
import {
    REVIEW_SORTS,
    deleteReview,
    fetchEligibility,
    fetchRatingSummary,
    fetchReviews,
    relativeTime,
    sortReviews,
    type Eligibility,
    type RatingSummary,
    type Review,
    type ReviewSort,
} from '../../commerce/reviews';
import { Button, EmptyState, ErrorState, IconButton, Sheet, Skeleton, Stars, UIText, elevation, initials, radius, space, tintFor } from '../../ui';
import useFooterOffset from '../../hooks/use-footer-offset';

const PAGE = 20;

/**
 * A store's reviews: the rating summary and distribution, the viewer's own review (with
 * delete), sortable reviews with photos and "Verified purchase", and a footer that either
 * offers "Write a review" or explains why the viewer can't yet.
 */
const StoreReviewsScreen = ({ route }: any) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t, locale } = useLanguage();
    const { mode } = useStorefrontRuntime();
    const request = useReviewRequest();
    const { storeId, storeName = '', storeLogo = null } = route.params ?? {};
    // Above the tab bar, which already clears the home indicator.
    const footerOffset = useFooterOffset(false);
    const [sort, setSort] = useState<ReviewSort>('newest');
    const [reviews, setReviews] = useState<Review[]>([]);
    const [summary, setSummary] = useState<RatingSummary | null>(null);
    const [eligibility, setEligibility] = useState<Eligibility | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<Review | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [version, setVersion] = useState(0);
    const latest = useRef(0);
    const now = useMemo(() => new Date(), []);

    const shown = useRef(0);
    shown.current = reviews.length;

    // Switching sort keeps the loaded reviews on screen (re-sorted at once by `changeSort`)
    // while the server's first page for that order loads; only an empty list shows skeletons.
    const load = useCallback(async () => {
        const id = ++latest.current;
        if (shown.current === 0) setLoading(true);
        setError(false);
        try {
            const [page, counts, canWrite] = await Promise.all([
                fetchReviews(request, { storeId, sort, limit: PAGE }),
                fetchRatingSummary(request, storeId),
                fetchEligibility(request, storeId).catch(() => null),
            ]);
            if (id !== latest.current) return;
            setReviews(page);
            setSummary(counts);
            setEligibility(canWrite);
            setDone(page.length < PAGE);
        } catch {
            if (id === latest.current && shown.current === 0) setError(true);
        } finally {
            if (id === latest.current) setLoading(false);
        }
    }, [request, sort, storeId]);

    useEffect(() => {
        load();
    }, [load, version]);

    // Coming back from writing a review should show it.
    const focused = useRef(false);
    useFocusEffect(
        useCallback(() => {
            if (focused.current) setVersion((value) => value + 1);
            focused.current = true;
        }, [])
    );

    const changeSort = (option: ReviewSort) => {
        if (option === sort) return;
        setReviews((current) => sortReviews(current, option));
        setSort(option);
    };

    const loadMore = async () => {
        if (loading || loadingMore || done) return;
        setLoadingMore(true);
        try {
            const next = await fetchReviews(request, { storeId, sort, limit: PAGE, offset: reviews.length });
            setReviews((current) => [...current, ...next.filter((review) => !current.some((existing) => existing.id === review.id))]);
            setDone(next.length < PAGE);
        } catch {
            setDone(true);
        } finally {
            setLoadingMore(false);
        }
    };

    const remove = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        try {
            await deleteReview(request, confirmDelete.id);
            setConfirmDelete(null);
            toast.success(t('Reviews.deleted'));
            setVersion((value) => value + 1);
        } catch {
            toast.error(t('Reviews.deleteFailed'));
        } finally {
            setDeleting(false);
        }
    };

    const mine = reviews.find((review) => review.mine) ?? null;
    const others = reviews.filter((review) => !review.mine);
    const write = () => navigation.navigate('WriteReview', { storeId, storeName, storeLogo, orderId: eligibility?.orderId ?? undefined });
    const signIn = () => navigation.navigate(mode === 'network' ? 'NetworkProfileTab' : 'StoreProfileTab', { screen: 'Login' });
    const hasReviews = (summary?.total ?? 0) > 0 || reviews.length > 0;

    const footer = (() => {
        if (loading || !eligibility) return null;
        if (eligibility.canReview) {
            return (
                <Button size='lg' fullWidth onPress={write}>
                    {t('Reviews.write')}
                </Button>
            );
        }
        if (eligibility.reason === 'sign_in_required') {
            return (
                <YStack gap={8}>
                    <InfoNote text={t('Reviews.signInToReview', { store: storeName })} />
                    <Button variant='outline' size='lg' fullWidth onPress={signIn}>
                        {t('Checkout.signIn')}
                    </Button>
                </YStack>
            );
        }
        return <InfoNote text={eligibility.reason === 'already_reviewed' ? t('Reviews.alreadyReviewed') : t('Reviews.afterOrder', { store: storeName })} />;
    })();

    const header = (
        <YStack>
            {loading && !summary ? (
                <YStack marginHorizontal={space.gutter} gap={12}>
                    <Skeleton height={120} radius={radius.card} />
                    <Skeleton height={18} width='60%' />
                    <Skeleton height={60} />
                </YStack>
            ) : hasReviews && summary ? (
                <XStack
                    marginHorizontal={space.gutter}
                    padding={16}
                    gap={18}
                    alignItems='center'
                    borderRadius={radius.card}
                    backgroundColor='$surface'
                    accessibilityLabel={t('Reviews.summaryLabel', { rating: summary.average ?? 0, count: summary.total })}
                >
                    <YStack alignItems='center' gap={2}>
                        <UIText variant='display' style={{ fontSize: 40, lineHeight: 44 }}>
                            {summary.average?.toFixed(1) ?? '–'}
                        </UIText>
                        <Stars value={summary.average ?? 0} size={13} />
                        <UIText variant='caption' tone='secondary'>
                            {t('UI.reviewsCount', { count: summary.total })}
                        </UIText>
                    </YStack>
                    <YStack flex={1} gap={5}>
                        {summary.rows.map((row) => (
                            <XStack key={row.star} alignItems='center' gap={8} accessibilityLabel={t('Reviews.rowLabel', { star: row.star, count: row.count })}>
                                <UIText variant='captionStrong' style={{ width: 10, textAlign: 'right', fontSize: 12 }}>
                                    {row.star}
                                </UIText>
                                <YStack flex={1} height={8} borderRadius={radius.pill} backgroundColor='$surface2' overflow='hidden'>
                                    <YStack height={8} width={`${row.percent}%`} borderRadius={radius.pill} backgroundColor='$warning' />
                                </YStack>
                                <UIText variant='caption' tone='secondary' style={{ width: 32, textAlign: 'right', fontSize: 12 }}>
                                    {row.count}
                                </UIText>
                            </XStack>
                        ))}
                    </YStack>
                </XStack>
            ) : null}

            {!!mine && (
                <YStack
                    marginHorizontal={space.gutter}
                    marginTop={14}
                    padding={14}
                    gap={8}
                    borderRadius={radius.card}
                    borderWidth={1}
                    borderColor='$primary'
                    backgroundColor='$primarySoft'
                    accessibilityLabel={t('Reviews.yours')}
                >
                    <XStack justifyContent='space-between' alignItems='center'>
                        <UIText variant='label' tone='brand'>
                            {t('Reviews.yours')}
                        </UIText>
                        <Button variant='ghost' size='sm' onPress={() => setConfirmDelete(mine)}>
                            {t('Reviews.delete')}
                        </Button>
                    </XStack>
                    <Stars value={mine.rating} size={15} />
                    {!!mine.content && <UIText>{mine.content}</UIText>}
                    <PhotoRow review={mine} />
                    <UIText variant='caption' tone='secondary'>
                        {[mine.verified ? t('Reviews.verified') : null, relativeTime(mine.createdAt, now, locale)].filter(Boolean).join(' · ')}
                    </UIText>
                </YStack>
            )}

            {hasReviews && (
                <XStack paddingHorizontal={space.gutter} paddingTop={16} paddingBottom={4} gap={8} flexWrap='wrap' accessibilityRole='radiogroup' accessibilityLabel={t('Reviews.sortLabel')}>
                    {REVIEW_SORTS.map((option) => {
                        const selected = option === sort;
                        return (
                            <Pressable
                                key={option}
                                onPress={() => changeSort(option)}
                                accessibilityRole='radio'
                                accessibilityState={{ checked: selected }}
                                style={{
                                    height: 36,
                                    paddingHorizontal: 14,
                                    borderRadius: radius.pill,
                                    borderWidth: 1,
                                    borderColor: selected ? theme.textPrimary.val : theme.borderColor.val,
                                    backgroundColor: selected ? theme.textPrimary.val : theme.background.val,
                                    justifyContent: 'center',
                                }}
                            >
                                <UIText variant='captionStrong' style={{ color: selected ? theme.background.val : theme.textPrimary.val }}>
                                    {t(`Reviews.sort.${option}`)}
                                </UIText>
                            </Pressable>
                        );
                    })}
                </XStack>
            )}
        </YStack>
    );

    return (
        <YStack flex={1} backgroundColor='$background'>
            <XStack alignItems='center' gap={8} paddingHorizontal={8} paddingTop={insets.top + 4} paddingBottom={8}>
                <IconButton icon={faChevronLeft} variant='plain' size={44} accessibilityLabel={t('UI.backTo', { name: storeName || t('UI.back') })} onPress={() => navigation.goBack()} />
                <YStack flex={1}>
                    <UIText variant='heading' accessibilityRole='header'>
                        {t('Reviews.title')}
                    </UIText>
                    {!!storeName && (
                        <UIText variant='caption' tone='secondary'>
                            {storeName}
                        </UIText>
                    )}
                </YStack>
            </XStack>

            {error ? (
                <ErrorState title={t('Reviews.loadFailed')} onRetry={() => setVersion((value) => value + 1)} />
            ) : (
                <FlatList
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    data={loading ? [] : others}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={header}
                    ListEmptyComponent={
                        <View>{!loading && !hasReviews && <EmptyState icon={faStar} title={t('Reviews.emptyTitle')} description={t('Reviews.emptyBody', { store: storeName })} />}</View>
                    }
                    renderItem={({ item }) => <ReviewRow review={item} now={now} />}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    contentContainerStyle={{ paddingBottom: 140 }}
                    ListFooterComponent={loadingMore ? <Skeleton height={80} style={{ marginHorizontal: space.gutter, marginTop: 12 }} /> : null}
                />
            )}

            {!!footer && (
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
                    style={elevation.floating}
                >
                    {footer}
                </YStack>
            )}

            <Sheet
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                title={t('Reviews.deleteTitle')}
                footer={
                    <YStack gap={8}>
                        <Button variant='destructive' size='lg' fullWidth loading={deleting} onPress={remove}>
                            {t('Reviews.deleteConfirm')}
                        </Button>
                        <Button variant='ghost' size='lg' fullWidth onPress={() => setConfirmDelete(null)}>
                            {t('Reviews.keep')}
                        </Button>
                    </YStack>
                }
            >
                <UIText tone='secondary'>{t('Reviews.deleteBody', { store: storeName })}</UIText>
            </Sheet>
        </YStack>
    );
};

function InfoNote({ text }: { text: string }) {
    const theme = useTheme();
    return (
        <XStack gap={10} alignItems='center' padding={12} borderRadius={radius.button} backgroundColor='$surface'>
            <FontAwesomeIcon icon={faCircleInfo} size={18} color={theme.textSecondary.val} />
            <UIText flex={1} variant='caption' tone='secondary'>
                {text}
            </UIText>
        </XStack>
    );
}

function PhotoRow({ review }: { review: Review }) {
    const { t } = useLanguage();
    if (review.photos.length === 0) return null;
    return (
        <XStack gap={8} flexWrap='wrap'>
            {review.photos.map((photo) => (
                <Image
                    key={photo.id}
                    source={{ uri: photo.url }}
                    accessibilityLabel={t('Reviews.photoBy', { name: review.author })}
                    style={{ width: 72, height: 72, borderRadius: radius.tile }}
                />
            ))}
        </XStack>
    );
}

function ReviewRow({ review, now }: { review: Review; now: Date }) {
    const { t, locale } = useLanguage();
    const when = relativeTime(review.createdAt, now, locale);
    return (
        <YStack marginHorizontal={space.gutter} paddingVertical={16} gap={8} borderBottomWidth={1} borderColor='$borderColor' accessibilityRole='summary'>
            <XStack gap={10} alignItems='center'>
                {review.avatarUrl ? (
                    <Image source={{ uri: review.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} accessibilityIgnoresInvertColors />
                ) : (
                    <YStack width={36} height={36} borderRadius={18} alignItems='center' justifyContent='center' style={{ backgroundColor: tintFor(review.author || '?') }}>
                        <UIText variant='captionStrong' style={{ color: '#1b2230' }}>
                            {initials(review.author || '?')}
                        </UIText>
                    </YStack>
                )}
                <YStack flex={1}>
                    <UIText variant='bodyStrong' style={{ fontSize: 14 }}>
                        {review.author || t('Reviews.customer')}
                    </UIText>
                    {!!when && (
                        <UIText variant='caption' tone='secondary' style={{ fontSize: 12 }}>
                            {when}
                        </UIText>
                    )}
                </YStack>
                <Stars value={review.rating} size={12} />
            </XStack>
            {!!review.content && <UIText style={{ fontSize: 14 }}>{review.content}</UIText>}
            <PhotoRow review={review} />
            {review.verified && <VerifiedLine />}
        </YStack>
    );
}

function VerifiedLine() {
    const theme = useTheme();
    const { t } = useLanguage();
    return (
        <XStack alignItems='center' gap={4}>
            <FontAwesomeIcon icon={faCheck} size={11} color={theme.successForeground.val} />
            <UIText variant='captionStrong' tone='success' style={{ fontSize: 12 }}>
                {t('Reviews.verified')}
            </UIText>
        </XStack>
    );
}

export default StoreReviewsScreen;
