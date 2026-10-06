import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView } from 'react-native';
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
};

/**
 * A bottom sheet built on the platform modal, so it works the same on iOS, Android
 * and the web. Tapping the backdrop or the close button dismisses it; screen readers
 * get a modal with a labelled header.
 */
export function Sheet({ open, onClose, title, children, footer, dismissible = true, maxHeightRatio = 0.88 }: SheetProps) {
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();

    return (
        <Modal visible={open} transparent animationType='slide' onRequestClose={dismissible ? onClose : () => {}} statusBarTranslucent>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <YStack flex={1} justifyContent='flex-end'>
                    <Pressable
                        accessibilityRole='button'
                        accessibilityLabel={t('UI.close')}
                        onPress={dismissible ? onClose : undefined}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,14,20,0.48)' }}
                    />
                    <YStack
                        accessibilityViewIsModal
                        backgroundColor='$background'
                        borderTopLeftRadius={radius.sheet}
                        borderTopRightRadius={radius.sheet}
                        maxHeight={`${Math.round(maxHeightRatio * 100)}%` as any}
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
                        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: footer ? 12 : insets.bottom + 20 }} keyboardShouldPersistTaps='handled'>
                            {children}
                        </ScrollView>
                        {footer && (
                            <YStack paddingHorizontal={20} paddingTop={12} paddingBottom={insets.bottom + 16} borderTopWidth={1} borderColor='$borderColor'>
                                {footer}
                            </YStack>
                        )}
                    </YStack>
                </YStack>
            </KeyboardAvoidingView>
        </Modal>
    );
}
