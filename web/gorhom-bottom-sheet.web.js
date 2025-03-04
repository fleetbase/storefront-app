import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, FlatList, TextInput, StyleSheet, Animated, Easing } from 'react-native-web';
import { createPortal } from 'react-dom';

// A minimal BottomSheet polyfill using a portal and Animated API
export const BottomSheet = forwardRef((props, ref) => {
    const {
        index = -1,
        snapPoints = ['50%'],
        onAnimate, // optional callback
        keyboardBehavior,
        keyboardBlurBehavior,
        enableDynamicSizing,
        enablePanDownToClose,
        enableOverDrag,
        style,
        backgroundStyle,
        handleIndicatorStyle,
        children,
        ...rest
    } = props;

    // We'll use Animated.Value to animate the vertical translation.
    const translateY = useRef(new Animated.Value(window.innerHeight)).current;
    const [isOpen, setIsOpen] = useState(false);

    // Function to open the bottom sheet to a specified snap point.
    const openSheet = (snapPoint) => {
        // Convert a percentage snap point (e.g. '50%') to a pixel value.
        let target = window.innerHeight; // default closed value
        if (typeof snapPoint === 'string' && snapPoint.endsWith('%')) {
            const percent = parseFloat(snapPoint);
            target = window.innerHeight * (1 - percent / 100);
        } else if (typeof snapPoint === 'number') {
            target = snapPoint;
        }
        Animated.timing(translateY, {
            toValue: target,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
        }).start(() => {
            setIsOpen(true);
            if (onAnimate) onAnimate(0, 1); // stub: you may pass more meaningful values
        });
    };

    // Function to close the bottom sheet.
    const closeSheet = () => {
        Animated.timing(translateY, {
            toValue: window.innerHeight,
            duration: 300,
            easing: Easing.in(Easing.ease),
            useNativeDriver: false,
        }).start(() => {
            setIsOpen(false);
            if (onAnimate) onAnimate(1, 0);
        });
    };

    // Expose methods via ref.
    useImperativeHandle(ref, () => ({
        collapse: () => {
            // Collapse to first snap point.
            if (snapPoints.length > 0) {
                openSheet(snapPoints[0]);
            }
        },
        close: () => {
            closeSheet();
        },
        forceClose: () => {
            closeSheet();
        },
        snapToPosition: (position) => {
            openSheet(position);
        },
    }));

    // On mount, if index is >= 0 (open), open the sheet to the corresponding snap point.
    useEffect(() => {
        if (index >= 0 && snapPoints.length > 0) {
            openSheet(snapPoints[index] || snapPoints[0]);
        }
    }, [index, snapPoints]);

    // Render the sheet in a portal so it appears at the bottom of the viewport.
    return createPortal(
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }, style, backgroundStyle]} {...rest}>
            <View style={[styles.handle, handleIndicatorStyle]} />
            {children}
        </Animated.View>,
        document.body
    );
});

const styles = StyleSheet.create({
    sheet: {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
        maxHeight: '100%',
        zIndex: 1000,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#ccc',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginVertical: 8,
    },
});

// A simple wrapper around View for BottomSheetView.
export const BottomSheetView = (props) => <View {...props} />;

// A simple wrapper around FlatList for BottomSheetFlatList.
export const BottomSheetFlatList = (props) => <FlatList {...props} />;

// A simple wrapper around TextInput for BottomSheetTextInput.
export const BottomSheetTextInput = (props) => <TextInput {...props} />;

export default BottomSheet;
