import React from 'react';
import { View, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

const CustomHeader = ({
    title = '',
    headerLeft,
    headerRight,
    headerStyle,
    headerRowStyle,
    headerLeftStyle,
    headerRightStyle,
    headerTitleAlign = 'center',
    headerTransparent = false,
    headerShadowVisible = true,
    backgroundColor = '#fff',
    titleColor = '#000',
    headerRowProps = {},
    headerLeftProps = {},
    headerRightProps = {},
    titleProps = {},
    headerHeight = 56,
}) => {
    const insets = useSafeAreaInsets();
    const nativeHeaderHeight = useHeaderHeight();

    return (
        <View
            style={[
                { backgroundColor: headerTransparent ? 'transparent' : backgroundColor, marginTop: nativeHeaderHeight > 0 ? 0 : insets.top },
                headerStyle,
                headerShadowVisible && styles.shadow,
            ]}
        >
            <XStack height={headerHeight} style={[styles.headerRow, headerRowStyle]} {...headerRowProps}>
                <YStack height={headerHeight} alignItems='flex-start' justifyContent='center' style={[styles.side, headerLeftStyle]} {...headerLeftProps}>
                    {typeof headerLeft === 'function' ? headerLeft() : headerLeft}
                </YStack>
                <YStack style={[styles.titleContainer, { alignItems: headerTitleAlign }]} {...titleProps}>
                    <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
                </YStack>
                <YStack height={headerHeight} alignItems='flex-end' justifyContent='center' style={[styles.side, headerRightStyle]} {...headerRightProps}>
                    {typeof headerRight === 'function' ? headerRight() : headerRight}
                </YStack>
            </XStack>
        </View>
    );
};

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    side: {
        minWidth: 70,
    },
    titleContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 0.2,
        shadowRadius: 1.2,
        elevation: 2,
    },
});

export default CustomHeader;
