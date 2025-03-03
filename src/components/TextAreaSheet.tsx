import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useTheme, Text, Button, XStack, YStack, Input } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faSave } from '@fortawesome/free-solid-svg-icons';
import { Portal } from '@gorhom/portal';
import useAppTheme from '../hooks/use-app-theme';
import { useLanguage } from '../contexts/LanguageContext';

const TextAreaSheet = ({ value = null, title = null, placeholder = null, onBottomSheetPositionChanged, onBottomSheetOpened, onBottomSheetClosed, portalHost = 'MainPortal', onChange }) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useAppTheme();
    const { t } = useLanguage();
    const [text, setText] = useState(value);
    const textAreaInputRef = useRef(null);
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['90%'], []);
    const renderPlaceholder = !text && typeof placeholder === 'string';

    const openBottomSheet = () => {
        bottomSheetRef.current?.snapToPosition('90%');
        textAreaInputRef.current?.focus();
    };

    const closeBottomSheet = () => {
        Keyboard.dismiss();
        bottomSheetRef.current?.close();
    };

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

    useEffect(() => {
        if (typeof onChange === 'function') {
            onChange(text);
        }
    }, [text]);

    return (
        <YStack>
            <Button
                alignItems='flex-start'
                justifyContent='flex-start'
                bg='$background'
                borderWidth={1}
                borderColor='$borderColorWithShadow'
                borderRadius='$5'
                py='$3'
                px='$3'
                height={80}
                onPress={openBottomSheet}
            >
                {renderPlaceholder && (
                    <Button.Text fontSize={14} color='$textSecondary' opacity={0.6}>
                        {placeholder}
                    </Button.Text>
                )}
                {text && (
                    <Button.Text fontSize={14} color='$textPrimary'>
                        {text}
                    </Button.Text>
                )}
            </Button>

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
                    style={{ flex: 1, width: '100%' }}
                    backgroundStyle={{ backgroundColor: theme.background.val, borderWidth: 1, borderColor: theme.borderColorWithShadow.val }}
                    handleIndicatorStyle={{ backgroundColor: theme.secondary.val }}
                >
                    <YStack position='relative'>
                        {title && (
                            <YStack px='$3' py='$3'>
                                <Text>{title}</Text>
                            </YStack>
                        )}
                        <BottomSheetTextInput
                            ref={textAreaInputRef}
                            placeholder={placeholder}
                            value={text}
                            onChangeText={setText}
                            autoCapitalize='none'
                            autoComplete='off'
                            autoCorrect={false}
                            multiline={true}
                            autoFocus={false}
                            style={{
                                color: theme.textPrimary.val,
                                backgroundColor: theme.surface.val,
                                borderWidth: 1,
                                borderColor: theme.borderColorWithShadow.val,
                                padding: 14,
                                fontSize: 14,
                                marginBottom: 10,
                                height: '100%',
                            }}
                        />
                    </YStack>
                    <YStack position='absolute' left={0} right={0} bottom={insets.bottom} padding='$4'>
                        <Button borderWidth={1} bg='$primary' borderColor='$primaryBorder' onPress={closeBottomSheet}>
                            <Button.Icon>
                                <FontAwesomeIcon icon={faSave} color={theme['$primaryText'].val} />
                            </Button.Icon>
                            <Button.Text color='$primaryText'>{t('common.done')}</Button.Text>
                        </Button>
                    </YStack>
                </BottomSheet>
            </Portal>
        </YStack>
    );
};

export default TextAreaSheet;
