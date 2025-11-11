import React from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from 'tamagui';
import { useSafeTabBarHeight as useBottomTabBarHeight } from '../hooks/use-safe-tab-bar-height';
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
