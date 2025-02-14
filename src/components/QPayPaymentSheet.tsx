import React, { useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Pressable, StyleSheet, Linking } from 'react-native';
import { Image, Text, YStack, XStack, Separator, useTheme, Button } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight, faTimes } from '@fortawesome/free-solid-svg-icons';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { useNavigation } from '@react-navigation/native';
import BottomSheet, { BottomSheetView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import FastImage from 'react-native-fast-image';
import { Portal } from '@gorhom/portal';
import { isArray, later } from '../utils';
import Spacer from './Spacer';

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
        const theme = useTheme();
        const navigation = useNavigation();
        const bottomSheetRef = useRef<BottomSheet>(null);
        const snapPoints = useMemo(() => ['90%'], []);
        const banks = invoice && isArray(invoice.urls) ? invoice.urls : [];

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
                        toast.error('Unable to open bank app.', { position: ToastPosition.BOTTOM });
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
                        <BottomSheetView style={{ ...styles.bottomSheetView, backgroundColor: theme.surface.val }}>
                            <YStack>
                                <XStack alignItems='center' justifyContent='space-between' px='$5' mb='$2'>
                                    <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                        Select Bank
                                    </Text>
                                    <Button size='$2' onPress={() => bottomSheetRef.current?.close()} bg='$secondary' circular>
                                        <Button.Icon>
                                            <FontAwesomeIcon icon={faTimes} />
                                        </Button.Icon>
                                    </Button>
                                </XStack>
                                <BottomSheetFlatList
                                    data={banks}
                                    keyExtractor={keyExtractor}
                                    renderItem={renderItem}
                                    contentContainerStyle={styles.listContent}
                                    showsVerticalScrollIndicator={false}
                                    showsHorizontalScrollIndicator={false}
                                    ListFooterComponent={<Spacer height={100} />}
                                />
                                <Spacer height={200} />
                            </YStack>
                        </BottomSheetView>
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
    },
    bottomSheetView: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoContainer: {
        marginRight: 16,
    },
    listContent: {
        paddingBottom: 100,
    },
});

export default QPayPaymentSheet;
