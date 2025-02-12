import React from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from 'tamagui';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Spacer from './Spacer';

const AbsoluteTabBarScreenWrapper = ({ children, scrollable = false }) => {
    const theme = useTheme();
    const tabBarHeight = useBottomTabBarHeight();
    const insets = useSafeAreaInsets();
    const paddingBottom = tabBarHeight;

    if (scrollable) {
        return (
            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom }} showsVerticalScrollIndicator={false}>
                {children}
            </ScrollView>
        );
    }

    return <View style={{ flex: 1, backgroundColor: theme.background.val, paddingBottom }}>{children}</View>;
};

export default AbsoluteTabBarScreenWrapper;
