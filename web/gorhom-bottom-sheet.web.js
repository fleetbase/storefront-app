import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { View, FlatList, ScrollView, TextInput, Pressable, StyleSheet, Animated, Easing } from 'react-native-web';
import { createPortal } from 'react-dom';
import { Theme, useTheme, useThemeName } from 'tamagui';

// The app's column on wide screens (src/utils/web-column.ts).
const COLUMN_WIDTH = 480;
const COLUMN_MIN_WINDOW = 600;
const DURATION = 250;

/** A snap point ('50%', 320) as a height in pixels. */
function heightFor(snapPoint) {
    const viewport = window.innerHeight;
    if (typeof snapPoint === 'string' && snapPoint.endsWith('%')) return Math.round((viewport * parseFloat(snapPoint)) / 100);
    if (typeof snapPoint === 'number') return Math.min(snapPoint, viewport);
    return Math.round(viewport / 2);
}

/**
 * A web stand-in for @gorhom/bottom-sheet: a sheet that slides up from the bottom of the app's
 * column, over a backdrop. It supports the props and ref methods the app uses (index,
 * snapPoints, onChange, onClose, enablePanDownToClose; snapToIndex, snapToPosition, expand,
 * collapse, close, forceClose). It renders into document.body under the current theme.
 */
export const BottomSheet = forwardRef((props, ref) => {
    const { index = -1, snapPoints = ['50%'], onChange, onClose, onAnimate, enablePanDownToClose, style, backgroundStyle, handleIndicatorStyle, children } = props;
    const theme = useTheme();
    const themeName = useThemeName();
    const progress = useRef(new Animated.Value(0)).current;
    const [height, setHeight] = useState(() => (index >= 0 ? heightFor(snapPoints[index] ?? snapPoints[0]) : 0));
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [visible, setVisible] = useState(false);
    const callbacks = useRef({ onChange, onClose, onAnimate });
    callbacks.current = { onChange, onClose, onAnimate };

    const open = useCallback(
        (snapPoint, nextIndex) => {
            setHeight(heightFor(snapPoint));
            setVisible(true);
            setCurrentIndex((previous) => {
                callbacks.current.onAnimate?.(previous, nextIndex);
                return nextIndex;
            });
            Animated.timing(progress, { toValue: 1, duration: DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => callbacks.current.onChange?.(nextIndex));
        },
        [progress]
    );

    const close = useCallback(() => {
        setCurrentIndex((previous) => {
            if (previous !== -1) callbacks.current.onAnimate?.(previous, -1);
            return -1;
        });
        Animated.timing(progress, { toValue: 0, duration: DURATION, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
            if (!finished) return;
            setVisible(false);
            callbacks.current.onChange?.(-1);
            callbacks.current.onClose?.();
        });
    }, [progress]);

    const snapToIndex = useCallback((nextIndex) => (nextIndex < 0 ? close() : open(snapPoints[nextIndex] ?? snapPoints[snapPoints.length - 1], nextIndex)), [close, open, snapPoints]);

    useImperativeHandle(
        ref,
        () => ({
            snapToIndex,
            snapToPosition: (position) => open(position, Math.max(0, snapPoints.indexOf(position))),
            expand: () => snapToIndex(snapPoints.length - 1),
            collapse: () => snapToIndex(0),
            close,
            forceClose: close,
        }),
        [close, open, snapPoints, snapToIndex]
    );

    useEffect(() => {
        if (index >= 0) snapToIndex(index);
        // Only the starting index opens the sheet, as with the library; afterwards the ref does.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index]);

    // Escape closes a sheet that can be swiped away.
    useEffect(() => {
        if (!visible || !enablePanDownToClose) return;
        const onKeyDown = (event) => event.key === 'Escape' && close();
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [close, enablePanDownToClose, visible]);

    const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const background = theme.surface?.val ?? theme.background?.val;

    return createPortal(
        <Theme name={themeName} forceClassName>
            {/* Kept mounted while closed, as the library keeps its content. */}
            <View style={[styles.layer, { display: visible ? 'flex' : 'none', maxWidth: window.innerWidth >= COLUMN_MIN_WINDOW ? COLUMN_WIDTH : undefined }]} pointerEvents='box-none'>
                <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.4)', opacity: progress }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={enablePanDownToClose ? close : undefined} accessibilityLabel='Close' />
                </Animated.View>
                <Animated.View style={[styles.sheet, { height, backgroundColor: background, transform: [{ translateY }] }, style, backgroundStyle, { height }]}>
                    <View style={[styles.handle, { backgroundColor: theme.borderColor?.val ?? '#ccc' }, handleIndicatorStyle]} />
                    <View style={styles.content}>{children}</View>
                </Animated.View>
            </View>
        </Theme>,
        document.body
    );
});

const styles = StyleSheet.create({
    layer: {
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        marginHorizontal: 'auto',
        overflow: 'hidden',
        zIndex: 1000,
    },
    sheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginVertical: 8,
    },
    content: {
        flex: 1,
        minHeight: 0,
    },
});

// The library's content containers, as plain views.
export const BottomSheetView = (props) => <View {...props} />;
export const BottomSheetScrollView = (props) => <ScrollView {...props} />;
export const BottomSheetFlatList = (props) => <FlatList {...props} />;
export const BottomSheetTextInput = (props) => <TextInput {...props} />;

export default BottomSheet;
