import React from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from 'tamagui';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Spacer from './Spacer';

const AbsoluteTabBarScreenWrapper = ({ children, scrollable = false, ...props }) => {
    const paddingBottom = useBottomTabBarHeight();

    if (scrollable) {
        return (
            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom }} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} {...props}>
                {children}
            </ScrollView>
        );
    }

    return (
        <View style={{ flex: 1, paddingBottom }} {...props}>
            {children}
        </View>
    );
};

export default AbsoluteTabBarScreenWrapper;
