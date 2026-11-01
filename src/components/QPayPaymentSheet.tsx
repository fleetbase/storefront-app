import React, { useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Pressable, StyleSheet, Linking, Platform } from 'react-native';
import { Image, Text, YStack, XStack, Separator, useTheme, Button } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight, faTimes } from '@fortawesome/free-solid-svg-icons';
import { toast } from '../utils/toast';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FastImage from 'react-native-fast-image';
import { Portal } from '@gorhom/portal';
import { isArray, later } from '../utils';
import { isDesktopBrowser } from '../utils/web-device';

export interface Bank {
    name: string;
    description: string;
    logo: string;
    link: string;
}

export interface QPayPaymentSheetProps {
    invoice: {
        urls?: Bank[];
    };
    title?: string;
    portalHost?: string;
    wrapperStyle?: object;
    onBankSelect?: (bank: Bank) => void;
    onBottomSheetPositionChanged?: (isOpen: boolean) => void;
    onBottomSheetOpened?: (isOpen: boolean) => void;
    onBottomSheetClosed?: (isOpen: boolean) => void;
}

export interface QPayPaymentSheetRef {
    open: () => void;
    close: () => void;
}

const QPayPaymentSheet = forwardRef<QPayPaymentSheetRef, QPayPaymentSheetProps>(
    ({ invoice, title, wrapperStyle, onBankSelect, onBottomSheetPositionChanged, onBottomSheetOpened, onBottomSheetClosed, portalHost = 'MainPortal' }, ref) => {
        const { t } = useLanguage();
        const theme = useTheme();
        const insets = useSafeAreaInsets();
        const navigation = useNavigation();
        const bottomSheetRef = useRef<BottomSheet>(null);
        const snapPoints = useMemo(() => ['90%'], []);
        // A desktop browser can't open a bank's app: it shows the code to scan with a phone instead.
        const desktop = useMemo(() => isDesktopBrowser(), []);
        const banks = !desktop && invoice && isArray(invoice.urls) ? invoice.urls : [];
        const qrSize = desktop ? 220 : 100;

        // Expose open and close methods to parent via ref
        useImperativeHandle(ref, () => ({
            open: () => {
                bottomSheetRef.current?.snapToPosition('90%');
            },
            close: () => {
                bottomSheetRef.current?.close();
            },
            forceClose: () => {
                bottomSheetRef.current?.forceClose();
            },
        }));

        const handleBankSelect = useCallback(
            (bank: Bank) => {
                bottomSheetRef.current?.forceClose();
                if (onBankSelect) {
                    onBankSelect(bank);
                }
            },
            [onBankSelect, bottomSheetRef.current]
        );

        const openLink = useCallback(
            async (bank) => {
                handleBankSelect(bank);

                bottomSheetRef.current?.forceClose();
                try {
                    const supported = await Linking.canOpenURL(bank.link);
                    if (supported) {
                        await Linking.openURL(bank.link);
                    } else {
                        // Try to open anyway on Android (sometimes canOpenURL is too strict)
                        if (Platform.OS === 'android') {
                            try {
                                await Linking.openURL(bank.link);
                            } catch (androidErr) {
                                console.error('Android fallback failed:', androidErr);
                                toast.error(t('QPayPaymentSheet.unableToOpenBank'));
                            }
                        } else {
                            toast.error(t('QPayPaymentSheet.unableToOpenBank'));
                        }
                    }
                } catch (err) {
                    console.error('Unable to open bank link:', err);
                }
            },
            [onBankSelect]
        );

        const handleBottomSheetPositionChange = useCallback(
            (fromIndex, toIndex) => {
                const isOpen = toIndex >= 0;

                if (typeof onBottomSheetPositionChanged === 'function') {
                    onBottomSheetPositionChanged(isOpen, fromIndex, toIndex);
                }

                if (isOpen === true && typeof onBottomSheetOpened === 'function') {
                    onBottomSheetOpened(isOpen, fromIndex, toIndex);
                }

                if (isOpen === false && typeof onBottomSheetClosed === 'function') {
                    onBottomSheetClosed(isOpen, fromIndex, toIndex);
                }
            },
            [bottomSheetRef.current, onBottomSheetPositionChanged, onBottomSheetOpened, onBottomSheetClosed]
        );

        const renderItem = useCallback(
            ({ item: bank }: { item: Bank }) => (
                <Pressable onPress={() => openLink(bank)}>
                    <YStack py='$3' borderBottomWidth={1} borderColor='$borderColor'>
                        <XStack space='$2' px='$4' style={styles.row}>
                            <YStack style={styles.logoContainer}>
                                <FastImage source={{ uri: bank.logo }} style={{ width: 40, height: 40, borderRadius: 8 }} />
                            </YStack>
                            <YStack space='$1'>
                                <Text size='$4' color='$textPrimary' fontWeight='bold' numberOfLines={1}>
                                    {bank.name}
                                </Text>
                                <Text size='$3' color='$textSecondary' numberOfLines={1}>
                                    {bank.description}
                                </Text>
                            </YStack>
                        </XStack>
                    </YStack>
                </Pressable>
            ),
            [handleBankSelect]
        );

        const keyExtractor = useCallback((item: Bank, index) => index, []);

        return (
            <YStack style={wrapperStyle}>
                <Portal hostName={portalHost}>
                    <BottomSheet
                        ref={bottomSheetRef}
                        index={-1}
                        snapPoints={snapPoints}
                        onAnimate={handleBottomSheetPositionChange}
                        keyboardBehavior='extend'
                        keyboardBlurBehavior='none'
                        enableDynamicSizing={false}
                        enablePanDownToClose={true}
                        enableOverDrag={false}
                        style={{ ...styles.bottomSheet }}
                        backgroundStyle={{ backgroundColor: theme.surface.val, borderWidth: 1, borderColor: theme.borderColorWithShadow.val }}
                        handleIndicatorStyle={{ backgroundColor: theme.secondary.val }}
                    >
                        {/* The list is the sheet's own scroll view (header included), so every bank
                            can be reached; inside a plain view it grew past the sheet and was clipped. */}
                        <BottomSheetFlatList
                            data={banks}
                            keyExtractor={keyExtractor}
                            renderItem={renderItem}
                            style={{ backgroundColor: theme.surface.val }}
                            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                            showsVerticalScrollIndicator={false}
                            showsHorizontalScrollIndicator={false}
                            ListHeaderComponent={
                                <YStack>
                                    {typeof invoice?.qr_image === 'string' && (
                                        <XStack alignItems='center' justifyContent='center' mb='$4'>
                                            <Image
                                                width={qrSize}
                                                height={qrSize}
                                                bg='white'
                                                padding='$1'
                                                borderRadius='$4'
                                                borderWidth={1}
                                                borderColor='$borderColor'
                                                source={{ uri: `data:image/png;base64,${invoice.qr_image}` }}
                                            />
                                        </XStack>
                                    )}
                                    <XStack alignItems='center' justifyContent='space-between' px='$5' mb='$2'>
                                        <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                            {desktop ? t('QPayPaymentSheet.scanToPay') : t('QPayPaymentSheet.selectBank')}
                                        </Text>
                                        <Button size='$2' onPress={() => bottomSheetRef.current?.close()} bg='$secondary' circular>
                                            <Button.Icon>
                                                <FontAwesomeIcon icon={faTimes} />
                                            </Button.Icon>
                                        </Button>
                                    </XStack>
                                    {desktop && typeof invoice?.qr_image === 'string' && (
                                        <Text px='$5' color='$textSecondary' fontSize='$4'>
                                            {t('QPayPaymentSheet.scanWithBankApp')}
                                        </Text>
                                    )}
                                </YStack>
                            }
                            ListEmptyComponent={
                                invoice?.error ? (
                                    <YStack alignItems='center' justifyContent='center' py='$4' height={150}>
                                        <Text color='$color'>{errorText(invoice.error)}</Text>
                                        {!!invoice.message && <Text color='$textSecondary'>{errorText(invoice.message)}</Text>}
                                    </YStack>
                                ) : null
                            }
                        />
                    </BottomSheet>
                </Portal>
            </YStack>
        );
    }
);

const styles = StyleSheet.create({
    bottomSheet: {
        flex: 1,
        width: '100%',
        zIndex: 999,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoContainer: {
        marginRight: 16,
    },
});

export default QPayPaymentSheet;

/**
 * QPay sends some errors as objects (e.g. validation messages keyed by field, `{ email: … }`);
 * flatten them to text instead of rendering the object.
 */
function errorText(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(errorText).filter(Boolean).join(' ');
    if (typeof value === 'object')
        return Object.values(value as Record<string, unknown>)
            .map(errorText)
            .filter(Boolean)
            .join(' ');
    return String(value);
}
