import React from 'react';
import { Pressable } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack, useTheme } from 'tamagui';
import { UIText } from './Text';

/**
 * The bottom tab bar, drawn from theme roles so it follows the brand and dark mode.
 * Each tab's icon and label come from its `tabBarIcon` / `tabBarLabel` options; the
 * active tab uses the readable brand color.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <XStack accessibilityRole='tablist' backgroundColor='$background' borderTopWidth={1} borderColor='$borderColor' paddingBottom={Math.max(insets.bottom, 6)} paddingTop={6}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const focused = state.index === index;
                const color = focused ? theme.primaryForeground.val : theme.textSecondary.val;
                const label = options.tabBarLabel ?? options.title ?? route.name;
                const accessibilityLabel = options.tabBarAccessibilityLabel ?? (typeof label === 'string' ? label : undefined);

                const onPress = () => {
                    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                    if (!focused && !event.defaultPrevented) {
                        navigation.navigate(route.name, route.params);
                    }
                };

                return (
                    <Pressable
                        key={route.key}
                        onPress={onPress}
                        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                        accessibilityRole='tab'
                        accessibilityState={{ selected: focused }}
                        accessibilityLabel={accessibilityLabel}
                        testID={options.tabBarButtonTestID}
                        style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
                    >
                        <YStack alignItems='center' gap={3}>
                            {options.tabBarIcon?.({ focused, color, size: 22 })}
                            {typeof label === 'function' ? (
                                label({ focused, color, position: 'below-icon', children: route.name })
                            ) : (
                                <UIText variant='caption' style={{ color, fontSize: 11, lineHeight: 14, fontWeight: focused ? '700' : '600' }}>
                                    {label}
                                </UIText>
                            )}
                        </YStack>
                    </Pressable>
                );
            })}
        </XStack>
    );
}
