import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowRotateRight, faCamera, faChevronLeft, faComments, faPaperPlane, faPhone } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import useChatRequest from '../../hooks/use-chat-request';
import useSocketClusterClient from '../../hooks/use-socket-cluster-client';
import { ApiError } from '../../commerce/http';
import {
    MAX_CHAT_PHOTOS,
    QUICK_REPLIES,
    chatDriver,
    fetchChat,
    fetchOlderMessages,
    markChatRead,
    mergeMessages,
    sendChatMessage,
    type ChatMessage,
    type OrderChat,
} from '../../commerce/order-chat';
import { shortName } from '../../commerce/order-progress';
import { Button, EmptyState, ErrorState, IconButton, Skeleton, UIText, formatClock, initials, radius, space, usesTwelveHourClock } from '../../ui';

type Photo = { data: string; type: string; uri: string };
type Row = ChatMessage & { photos?: Photo[] };

/**
 * Real-time chat with the driver delivering an order. Messages load from the chat API,
 * new ones arrive on the chat's socket channel, and sending is optimistic: a message shows
 * straight away and can be retried if it fails. The chat becomes read-only once the order
 * is finished.
 */
const OrderChatScreen = ({ route }: any) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t, locale } = useLanguage();
    const { customer } = useAuth();
    const request = useChatRequest();
    const { listen, isConnected } = useSocketClusterClient();
    const hour12 = usesTwelveHourClock(locale);
    const { orderId, orderReference, storeName, driverPhone } = route.params ?? {};
    const [chat, setChat] = useState<OrderChat | null>(null);
    const [messages, setMessages] = useState<Row[]>([]);
    const [error, setError] = useState<'no_driver' | 'failed' | null>(null);
    const [draft, setDraft] = useState('');
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [noMoreOlder, setNoMoreOlder] = useState(false);
    const [closedNow, setClosedNow] = useState(false);
    const listRef = useRef<FlatList>(null);
    const counter = useRef(0);

    const refresh = useCallback(async () => {
        if (!orderId) return;
        try {
            const next = await fetchChat(request, orderId);
            setChat(next);
            setMessages((current) => mergeMessages(current, next.messages));
            setError(null);
            if (next.unread > 0) markChatRead(request, orderId).catch(() => {});
        } catch (failure) {
            setError(failure instanceof ApiError && failure.reason === 'driver_not_assigned' ? 'no_driver' : 'failed');
        }
    }, [orderId, request]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // Live updates: any message or receipt event on the channel re-reads the latest page.
    useEffect(() => {
        if (!chat?.channel) return;
        let listener: any = null;
        let stopped = false;
        listen(chat.channel, (event: any) => {
            if (String(event?.event ?? '').startsWith('chat_')) refresh();
        }).then((subscription: any) => {
            if (stopped) subscription?.stop?.();
            else listener = subscription;
        });
        return () => {
            stopped = true;
            listener?.stop?.();
        };
    }, [chat?.channel, listen, refresh]);

    const loadOlder = async () => {
        const oldest = messages.find((message) => !message.state);
        if (!orderId || !oldest || loadingOlder || noMoreOlder) return;
        setLoadingOlder(true);
        try {
            const older = await fetchOlderMessages(request, orderId, oldest.id);
            setMessages((current) => mergeMessages(current, older));
            setNoMoreOlder(older.length === 0);
        } catch {
            setNoMoreOlder(true);
        } finally {
            setLoadingOlder(false);
        }
    };

    const send = async (content: string, photos: Photo[] = [], retryId?: string) => {
        if (!orderId || (!content.trim() && photos.length === 0)) return;
        const localId = retryId ?? `local-${Date.now()}-${counter.current++}`;
        const local: Row = {
            id: localId,
            content: content.trim(),
            mine: true,
            senderName: null,
            attachments: photos.map((photo, index) => ({ id: `${localId}-${index}`, url: photo.uri, type: photo.type })),
            read: false,
            createdAt: null,
            state: 'sending',
            photos,
        };
        setMessages((current) => [...current.filter((message) => message.id !== localId), local]);
        try {
            const sent = await sendChatMessage(request, orderId, { content, photos: photos.map(({ data, type }) => ({ data, type })) });
            setMessages((current) =>
                mergeMessages(
                    current.filter((message) => message.id !== localId),
                    [sent]
                )
            );
        } catch (failure) {
            if (failure instanceof ApiError && failure.reason === 'chat_closed') {
                setClosedNow(true);
                setMessages((current) => current.filter((message) => message.id !== localId));
                return;
            }
            setMessages((current) => current.map((message) => (message.id === localId ? { ...message, state: 'failed' } : message)));
        }
    };

    const submit = () => {
        const text = draft;
        setDraft('');
        send(text);
    };

    const pickPhotos = async () => {
        const result = await launchImageLibrary({ mediaType: 'photo', includeBase64: true, selectionLimit: MAX_CHAT_PHOTOS, maxWidth: 1600, maxHeight: 1600, quality: 0.8 });
        const photos = (result.assets ?? []).filter((asset) => asset.base64 && asset.uri).map((asset) => ({ data: asset.base64!, type: asset.type ?? 'image/jpeg', uri: asset.uri! }));
        if (photos.length) send('', photos);
    };

    const driver = chatDriver(chat);
    const driverName = driver?.name ? shortName(driver.name) : (route.params?.driverName ?? t('Tracking.yourDriver'));
    const closed = chat?.status === 'closed' || closedNow;
    const data = useMemo(() => [...messages].reverse(), [messages]);
    const time = (value: string | null) => {
        if (!value) return '';
        const at = new Date(value);
        return formatClock(at.getHours() * 60 + at.getMinutes(), hour12);
    };

    const header = (
        <XStack
            alignItems='center'
            gap={8}
            paddingHorizontal={8}
            paddingTop={insets.top + 4}
            paddingBottom={10}
            borderBottomWidth={1}
            borderColor='$borderColor'
            backgroundColor='$background'
        >
            <IconButton icon={faChevronLeft} variant='plain' size={44} accessibilityLabel={t('Chat.backToOrder')} onPress={() => navigation.goBack()} />
            <YStack width={40} height={40} borderRadius={20} backgroundColor='$primarySoft' alignItems='center' justifyContent='center'>
                {driver?.avatarUrl ? (
                    <Image source={{ uri: driver.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                ) : (
                    <UIText variant='captionStrong' tone='brand'>
                        {initials(driverName)}
                    </UIText>
                )}
                {!!chat && (
                    <YStack
                        position='absolute'
                        right={-1}
                        bottom={-1}
                        width={12}
                        height={12}
                        borderRadius={6}
                        borderWidth={2}
                        borderColor='$background'
                        backgroundColor={driver?.online && !closed ? '$success' : '$borderColorWithShadow'}
                    />
                )}
            </YStack>
            <YStack flex={1}>
                <UIText variant='bodyStrong' numberOfLines={1}>
                    {driverName}
                </UIText>
                <UIText variant='caption' tone='secondary' numberOfLines={1} style={{ fontSize: 12 }}>
                    {[t('Chat.yourDriver'), orderReference ? `#${orderReference}` : null, closed ? t('Chat.closedShort') : driver?.online ? t('Chat.online') : null]
                        .filter(Boolean)
                        .join(' · ')}
                </UIText>
            </YStack>
            {!!driverPhone && !closed && (
                <IconButton icon={faPhone} size={44} accessibilityLabel={t('Tracking.callDriver', { driver: driverName })} onPress={() => Linking.openURL(`tel:${driverPhone}`)} />
            )}
        </XStack>
    );

    if (!customer) {
        return (
            <YStack flex={1} backgroundColor='$background'>
                {header}
                <EmptyState icon={faComments} title={t('Notifications.signInTitle')} description={t('Chat.signInBody')} />
            </YStack>
        );
    }

    return (
        <YStack flex={1} backgroundColor='$surface'>
            {header}
            {!isConnected && !closed && !!chat && (
                <XStack gap={8} alignItems='center' paddingHorizontal={space.gutter} paddingVertical={8} backgroundColor='$warningSoft' accessibilityRole='alert'>
                    <FontAwesomeIcon icon={faArrowRotateRight} size={14} color={theme.warningForeground.val} />
                    <UIText flex={1} variant='captionStrong'>
                        {t('Chat.reconnecting')}
                    </UIText>
                </XStack>
            )}

            {error === 'no_driver' ? (
                <EmptyState icon={faComments} title={t('Chat.noDriverTitle')} description={t('Chat.noDriverBody')} actionLabel={t('UI.tryAgain')} onAction={refresh} />
            ) : error === 'failed' && !chat ? (
                <ErrorState title={t('Chat.loadFailed')} onRetry={refresh} />
            ) : !chat ? (
                <YStack padding={space.gutter} gap={10}>
                    <Skeleton height={40} width='70%' radius={18} />
                    <Skeleton height={40} width='55%' radius={18} style={{ alignSelf: 'flex-end' }} />
                    <Skeleton height={40} width='65%' radius={18} />
                </YStack>
            ) : (
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <FlatList
                        showsVerticalScrollIndicator={false}
                        showsHorizontalScrollIndicator={false}
                        ref={listRef}
                        inverted
                        data={data}
                        keyExtractor={(item) => item.id}
                        onEndReached={loadOlder}
                        onEndReachedThreshold={0.3}
                        contentContainerStyle={{ padding: space.gutter, gap: 8 }}
                        accessibilityRole='list'
                        accessibilityLabel={t('Chat.messages')}
                        ListFooterComponent={
                            <YStack alignSelf='center' maxWidth='85%' paddingHorizontal={12} paddingVertical={6} borderRadius={radius.pill} backgroundColor='$background' marginBottom={8}>
                                <UIText variant='captionStrong' tone='secondary' textAlign='center' style={{ fontSize: 12 }}>
                                    {t('Chat.intro', { driver: driverName, store: storeName ?? t('StoreSwitch.thisStore') })}
                                </UIText>
                            </YStack>
                        }
                        renderItem={({ item }) => <Bubble message={item} time={time(item.createdAt)} onRetry={() => send(item.content, item.photos ?? [], item.id)} />}
                    />

                    {closed ? (
                        <YStack
                            gap={6}
                            paddingHorizontal={space.gutter}
                            paddingTop={14}
                            paddingBottom={insets.bottom + 14}
                            borderTopWidth={1}
                            borderColor='$borderColor'
                            backgroundColor='$background'
                            accessibilityRole='summary'
                        >
                            <UIText variant='bodyStrong' textAlign='center' style={{ fontSize: 14 }}>
                                {t('Chat.closedTitle')}
                            </UIText>
                            <UIText variant='caption' tone='secondary' textAlign='center'>
                                {t('Chat.closedBody', { store: storeName ?? t('StoreSwitch.thisStore') })}
                            </UIText>
                        </YStack>
                    ) : (
                        <YStack paddingTop={10} paddingBottom={insets.bottom + 10} borderTopWidth={1} borderColor='$borderColor' backgroundColor='$background' gap={10}>
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyboardShouldPersistTaps='handled'
                                contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 8 }}
                                accessibilityLabel={t('Chat.quickReplies')}
                            >
                                {QUICK_REPLIES.map((key) => (
                                    <Pressable
                                        key={key}
                                        onPress={() => send(t(`Chat.quick.${key}`))}
                                        accessibilityRole='button'
                                        style={{ height: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: theme.borderColor.val, justifyContent: 'center' }}
                                    >
                                        <UIText variant='captionStrong'>{t(`Chat.quick.${key}`)}</UIText>
                                    </Pressable>
                                ))}
                            </ScrollView>
                            <XStack alignItems='center' gap={8} paddingHorizontal={space.gutter}>
                                <IconButton icon={faCamera} size={44} accessibilityLabel={t('Chat.sendPhoto')} onPress={pickPhotos} />
                                <TextInput
                                    value={draft}
                                    onChangeText={setDraft}
                                    placeholder={t('Chat.placeholder', { driver: driverName })}
                                    placeholderTextColor={theme.textPlaceholder.val}
                                    accessibilityLabel={t('Chat.placeholder', { driver: driverName })}
                                    onSubmitEditing={submit}
                                    returnKeyType='send'
                                    maxLength={2000}
                                    style={{
                                        flex: 1,
                                        minHeight: 44,
                                        paddingHorizontal: 16,
                                        borderRadius: radius.pill,
                                        borderWidth: 1,
                                        borderColor: theme.borderColor.val,
                                        backgroundColor: theme.surface.val,
                                        color: theme.textPrimary.val,
                                        fontSize: 15,
                                    }}
                                />
                                <IconButton icon={faPaperPlane} variant='solid' size={44} accessibilityLabel={t('Chat.send')} disabled={!draft.trim()} onPress={submit} />
                            </XStack>
                        </YStack>
                    )}
                </KeyboardAvoidingView>
            )}
        </YStack>
    );
};

function Bubble({ message, time, onRetry }: { message: Row; time: string; onRetry: () => void }) {
    const theme = useTheme();
    const { t } = useLanguage();
    const meta =
        message.state === 'sending'
            ? t('Chat.sending')
            : message.state === 'failed'
              ? t('Chat.failed')
              : [time, message.mine && message.read ? t('Chat.read') : null].filter(Boolean).join(' · ');
    return (
        <YStack
            alignSelf={message.mine ? 'flex-end' : 'flex-start'}
            maxWidth='78%'
            alignItems={message.mine ? 'flex-end' : 'flex-start'}
            gap={3}
            opacity={message.state === 'sending' ? 0.7 : 1}
        >
            {message.attachments.map((attachment) => (
                <Image key={attachment.id} source={{ uri: attachment.url }} style={{ width: 200, height: 140, borderRadius: 16 }} resizeMode='cover' accessibilityLabel={t('Chat.photo')} />
            ))}
            {!!message.content && (
                <YStack
                    paddingHorizontal={14}
                    paddingVertical={10}
                    borderRadius={18}
                    borderBottomRightRadius={message.mine ? 6 : 18}
                    borderBottomLeftRadius={message.mine ? 18 : 6}
                    backgroundColor={message.mine ? '$primary' : '$background'}
                >
                    <UIText style={{ color: message.mine ? theme.primaryText.val : theme.textPrimary.val, fontSize: 15, lineHeight: 21 }}>{message.content}</UIText>
                </YStack>
            )}
            {message.state === 'failed' ? (
                <Button variant='ghost' size='sm' onPress={onRetry}>
                    {t('Chat.retry')}
                </Button>
            ) : (
                <UIText variant='caption' tone='secondary' style={{ fontSize: 11 }}>
                    {meta}
                </UIText>
            )}
        </YStack>
    );
}

export default OrderChatScreen;
