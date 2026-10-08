import React, { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCamera, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useReviewRequest from '../../hooks/use-review-request';
import { MAX_REVIEW_LENGTH, MAX_REVIEW_PHOTOS, createReview, fetchEligibility, type Eligibility, type ReviewPhoto } from '../../commerce/reviews';
import { Button, IconButton, Skeleton, StarInput, StoreLogo, TextField, UIText, elevation, radius, space } from '../../ui';
import useScreenTopInset from '../../hooks/use-screen-top-inset';

type Photo = ReviewPhoto & { uri: string };

const WORDS = ['', 'poor', 'notGreat', 'okay', 'good', 'excellent'] as const;

/**
 * Write a verified-purchase review of a store: stars, text and up to four photos. The
 * server decides eligibility (a completed order not yet reviewed), so the screen checks
 * first and explains when the customer can't review yet.
 */
const WriteReviewScreen = ({ route }: any) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const top = useScreenTopInset(true);
    const theme = useTheme();
    const { t } = useLanguage();
    const { mode } = useStorefrontRuntime();
    const request = useReviewRequest();
    const { storeId, storeName = '', storeLogo = null, orderId = null, orderReference = null } = route.params ?? {};
    const [rating, setRating] = useState<number>(Number(route.params?.rating) || 0);
    const [content, setContent] = useState('');
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [eligibility, setEligibility] = useState<Eligibility | null>(null);
    const [checking, setChecking] = useState(true);
    const [posting, setPosting] = useState(false);
    const [failed, setFailed] = useState(false);
    const [posted, setPosted] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let active = true;
        setChecking(true);
        fetchEligibility(request, storeId, orderId)
            .then((result) => active && setEligibility(result))
            .catch(() => active && setEligibility(null))
            .finally(() => active && setChecking(false));
        return () => {
            active = false;
        };
    }, [attempt, orderId, request, storeId]);

    const addPhotos = async () => {
        const result = await launchImageLibrary({
            mediaType: 'photo',
            includeBase64: true,
            selectionLimit: MAX_REVIEW_PHOTOS - photos.length,
            maxWidth: 1600,
            maxHeight: 1600,
            quality: 0.8,
        });
        const picked = (result.assets ?? []).filter((asset) => asset.base64 && asset.uri).map((asset) => ({ data: asset.base64!, type: asset.type ?? 'image/jpeg', uri: asset.uri! }));
        setPhotos((current) => [...current, ...picked].slice(0, MAX_REVIEW_PHOTOS));
    };

    const ready = rating > 0 && content.trim().length > 0 && !!eligibility?.canReview;
    const submit = async () => {
        if (!ready || posting) return;
        setPosting(true);
        setFailed(false);
        try {
            await createReview(request, { subjectId: storeId, orderId: eligibility?.orderId ?? orderId, rating, content, photos: photos.map(({ data, type }) => ({ data, type })) });
            setPosted(true);
        } catch {
            setFailed(true);
        } finally {
            setPosting(false);
        }
    };

    if (posted) {
        return (
            <YStack flex={1} backgroundColor='$background' alignItems='center' justifyContent='center' paddingHorizontal={32} gap={12}>
                <YStack width={80} height={80} borderRadius={40} backgroundColor='$successSoft' alignItems='center' justifyContent='center'>
                    <FontAwesomeIcon icon={faCheck} size={36} color={theme.successForeground.val} />
                </YStack>
                <UIText variant='title' textAlign='center' accessibilityRole='header' aria-live='polite'>
                    {t('Reviews.thanksTitle')}
                </UIText>
                <UIText tone='secondary' textAlign='center'>
                    {t('Reviews.thanksBody', { store: storeName })}
                </UIText>
                <YStack marginTop={8} gap={4} alignSelf='stretch'>
                    <Button size='lg' fullWidth onPress={() => navigation.replace('StoreReviews', { storeId, storeName, storeLogo })}>
                        {t('Reviews.seeYours')}
                    </Button>
                    <Button variant='ghost' size='lg' fullWidth onPress={() => navigation.navigate(mode === 'network' ? 'NetworkHomeTab' : 'StoreHomeTab')}>
                        {t('Reviews.backToShopping')}
                    </Button>
                </YStack>
            </YStack>
        );
    }

    const blocked = !checking && !eligibility?.canReview;
    const blockedText = !eligibility
        ? t('Reviews.checkFailed')
        : eligibility.reason === 'sign_in_required'
          ? t('Reviews.signInToReview', { store: storeName })
          : eligibility.reason === 'already_reviewed'
            ? t('Reviews.alreadyReviewed')
            : t('Reviews.afterOrder', { store: storeName });
    const buttonText = rating === 0 ? t('Reviews.chooseRating') : !content.trim() ? t('Reviews.addWords') : failed ? t('UI.tryAgain') : t('Reviews.post');

    return (
        <YStack flex={1} backgroundColor='$background'>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={{ paddingTop: top + 4, paddingBottom: 140 }} keyboardShouldPersistTaps='handled'>
                    <XStack alignItems='center' gap={8} paddingHorizontal={8} paddingBottom={4}>
                        <IconButton icon={faXmark} variant='plain' size={44} accessibilityLabel={t('UI.close')} onPress={() => navigation.goBack()} />
                        <UIText variant='heading' accessibilityRole='header'>
                            {orderId ? t('Reviews.rateOrder') : t('Reviews.writeTitle')}
                        </UIText>
                    </XStack>

                    <YStack paddingHorizontal={space.gutter} gap={20}>
                        <XStack gap={12} alignItems='center' padding={12} borderRadius={radius.card} backgroundColor='$surface'>
                            <StoreLogo uri={storeLogo} name={storeName || '?'} size={44} radius={radius.tile} />
                            <YStack flex={1}>
                                <UIText variant='bodyStrong'>{storeName}</UIText>
                                {!!orderReference && (
                                    <UIText variant='caption' tone='secondary'>
                                        {t('Tracking.orderNumber', { number: orderReference })}
                                    </UIText>
                                )}
                            </YStack>
                        </XStack>

                        <YStack alignItems='center' gap={8}>
                            <UIText variant='subheading' style={{ fontSize: 18 }} textAlign='center'>
                                {t('Reviews.howWas', { store: storeName })}
                            </UIText>
                            <StarInput value={rating} onChange={setRating} label={t('Reviews.ratingLabel', { store: storeName })} />
                            <UIText variant='captionStrong' tone='secondary' aria-live='polite'>
                                {rating ? t(`Reviews.words.${WORDS[rating]}`) : t('Reviews.tapStar')}
                            </UIText>
                        </YStack>

                        <YStack gap={8}>
                            <UIText variant='subheading'>{t('Reviews.tellOthers')}</UIText>
                            <TextField
                                value={content}
                                onChangeText={(value) => setContent(value.slice(0, MAX_REVIEW_LENGTH))}
                                placeholder={t('Reviews.placeholder')}
                                multiline
                                style={{ minHeight: 120, textAlignVertical: 'top' }}
                                accessibilityLabel={t('Reviews.tellOthers')}
                                maxLength={MAX_REVIEW_LENGTH}
                            />
                            <UIText variant='caption' tone='secondary' alignSelf='flex-end'>
                                {content.length} / {MAX_REVIEW_LENGTH}
                            </UIText>
                        </YStack>

                        <YStack gap={8}>
                            <UIText variant='subheading'>
                                {t('Reviews.addPhotos')}{' '}
                                <UIText tone='secondary' variant='body'>
                                    · {t('Reviews.upTo', { count: MAX_REVIEW_PHOTOS })}
                                </UIText>
                            </UIText>
                            <XStack gap={8} flexWrap='wrap'>
                                {photos.map((photo, index) => (
                                    <YStack key={`${photo.uri}-${index}`}>
                                        <Image
                                            source={{ uri: photo.uri }}
                                            style={{ width: 76, height: 76, borderRadius: radius.tile }}
                                            accessibilityLabel={t('Reviews.photoNumber', { number: index + 1 })}
                                        />
                                        <Pressable
                                            onPress={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                                            accessibilityRole='button'
                                            accessibilityLabel={t('Reviews.removePhoto')}
                                            hitSlop={8}
                                            style={{
                                                position: 'absolute',
                                                top: -6,
                                                right: -6,
                                                width: 26,
                                                height: 26,
                                                borderRadius: 13,
                                                borderWidth: 2,
                                                borderColor: theme.background.val,
                                                backgroundColor: theme.textPrimary.val,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faXmark} size={11} color={theme.background.val} />
                                        </Pressable>
                                    </YStack>
                                ))}
                                {photos.length < MAX_REVIEW_PHOTOS && (
                                    <Pressable
                                        onPress={addPhotos}
                                        accessibilityRole='button'
                                        accessibilityLabel={t('Reviews.addPhoto')}
                                        style={{
                                            width: 76,
                                            height: 76,
                                            borderRadius: radius.tile,
                                            borderWidth: 2,
                                            borderStyle: 'dashed',
                                            borderColor: theme.borderColorWithShadow.val,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <FontAwesomeIcon icon={faCamera} size={22} color={theme.textSecondary.val} />
                                    </Pressable>
                                )}
                            </XStack>
                        </YStack>

                        <UIText variant='caption' tone='secondary'>
                            {t('Reviews.privacyNote')}
                        </UIText>
                    </YStack>
                </ScrollView>
            </KeyboardAvoidingView>

            <YStack
                position='absolute'
                left={0}
                right={0}
                bottom={0}
                paddingHorizontal={space.gutter}
                paddingTop={12}
                paddingBottom={insets.bottom + 12}
                gap={8}
                backgroundColor='$background'
                borderTopWidth={1}
                borderColor='$borderColor'
                style={elevation.floating}
            >
                {checking ? (
                    <Skeleton height={54} radius={radius.button} />
                ) : blocked ? (
                    <YStack gap={8}>
                        <UIText variant='captionStrong' tone='warning' textAlign='center' accessibilityRole='alert'>
                            {blockedText}
                        </UIText>
                        {!eligibility && (
                            <Button variant='outline' fullWidth onPress={() => setAttempt((value) => value + 1)}>
                                {t('UI.tryAgain')}
                            </Button>
                        )}
                    </YStack>
                ) : (
                    <>
                        {failed && (
                            <UIText variant='captionStrong' tone='error' textAlign='center' accessibilityRole='alert'>
                                {t('Reviews.postFailed')}
                            </UIText>
                        )}
                        <Button size='lg' fullWidth disabled={!ready} loading={posting} onPress={submit}>
                            {buttonText}
                        </Button>
                    </>
                )}
            </YStack>
        </YStack>
    );
};

export default WriteReviewScreen;
