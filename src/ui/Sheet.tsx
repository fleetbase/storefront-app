import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView } from 'react-native';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { IconButton } from './Button';
import { UIText } from './Text';
import { elevation, radius } from './tokens';

export type SheetProps = {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    /** Pinned below the scrolling content, e.g. "Show 8 stores". */
    footer?: React.ReactNode;
    /** Hide the close button for decision sheets that must be answered. */
    dismissible?: boolean;
    maxHeightRatio?: number;
    /** False when the content scrolls itself (e.g. a FlatList), which can't sit inside the sheet's ScrollView. */
    scrollable?: boolean;
};

/**
 * A bottom sheet built on the platform modal, so it works the same on iOS, Android
 * and the web. The backdrop fades in while the sheet slides up (just a fade with
 * reduced motion), and both reverse before the modal closes. Tapping the backdrop or
 * the close button dismisses it; screen readers get a modal with a labelled header.
 */
const OPEN_MS = 260;
const CLOSE_MS = 200;
const nativeDriver = Platform.OS !== 'web';

export function Sheet({ open, onClose, title, children, footer, dismissible = true, maxHeightRatio = 0.88, scrollable = true }: SheetProps) {
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    // Stays mounted while the closing animation runs.
    const [visible, setVisible] = useState(open);
    const progress = useRef(new Animated.Value(0)).current;
    const reduceMotion = useRef(false);

    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled?.()
            .then((enabled) => {
                reduceMotion.current = enabled;
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (open) {
            setVisible(true);
            Animated.timing(progress, { toValue: 1, duration: OPEN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
        } else if (visible) {
            Animated.timing(progress, { toValue: 0, duration: CLOSE_MS, easing: Easing.in(Easing.cubic), useNativeDriver: nativeDriver }).start(({ finished }) => {
                if (finished) setVisible(false);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const offscreen = Dimensions.get('window').height;
    const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion.current ? 0 : offscreen, 0] });

    return (
        <Modal visible={visible} transparent animationType='none' onRequestClose={dismissible ? onClose : () => {}} statusBarTranslucent>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <YStack flex={1} justifyContent='flex-end'>
                    <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: progress }}>
                        <Pressable
                            accessibilityRole='button'
                            accessibilityLabel={t('UI.close')}
                            onPress={dismissible ? onClose : undefined}
                            style={{ flex: 1, backgroundColor: 'rgba(10,14,20,0.48)' }}
                        />
                    </Animated.View>
                    <Animated.View style={{ maxHeight: `${Math.round(maxHeightRatio * 100)}%`, opacity: reduceMotion.current ? progress : 1, transform: [{ translateY }] }}>
                        <YStack
                            accessibilityViewIsModal
                            backgroundColor='$background'
                            borderTopLeftRadius={radius.sheet}
                            borderTopRightRadius={radius.sheet}
                            flexShrink={1}
                            style={elevation.sheet}
                        >
                            <YStack alignSelf='center' width={40} height={5} borderRadius={3} backgroundColor='$borderColorWithShadow' marginTop={8} />
                            {(title || dismissible) && (
                                <XStack alignItems='center' justifyContent='space-between' paddingHorizontal={20} paddingTop={12} paddingBottom={4} gap={12}>
                                    <UIText variant='heading' accessibilityRole='header' flex={1}>
                                        {title ?? ''}
                                    </UIText>
                                    {dismissible && <IconButton icon={faXmark} accessibilityLabel={t('UI.close')} onPress={onClose} />}
                                </XStack>
                            )}
                            {scrollable ? (
                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: footer ? 12 : insets.bottom + 20 }}
                                    keyboardShouldPersistTaps='handled'
                                >
                                    {children}
                                </ScrollView>
                            ) : (
                                <YStack flexShrink={1} paddingHorizontal={20} paddingTop={8} paddingBottom={footer ? 12 : insets.bottom + 20}>
                                    {children}
                                </YStack>
                            )}
                            {footer && (
                                <YStack paddingHorizontal={20} paddingTop={12} paddingBottom={insets.bottom + 16} borderTopWidth={1} borderColor='$borderColor'>
                                    {footer}
                                </YStack>
                            )}
                        </YStack>
                    </Animated.View>
                </YStack>
            </KeyboardAvoidingView>
        </Modal>
    );
}
