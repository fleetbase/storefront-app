import React from 'react';
import { Pressable } from 'react-native';
import { YStack, useTheme } from 'tamagui';
import { Sheet } from './Sheet';
import { UIText } from './Text';

/** Choose one option from a short list, e.g. the language or appearance. */
export function ChoiceSheet({
    open,
    title,
    options,
    selected,
    onSelect,
    onClose,
}: {
    open: boolean;
    title: string;
    options: { key: string; label: string }[];
    selected: string;
    onSelect: (key: string) => void;
    onClose: () => void;
}) {
    const theme = useTheme();
    return (
        <Sheet open={open} onClose={onClose} title={title}>
            <YStack>
                {options.map((option) => (
                    <Pressable
                        key={option.key}
                        onPress={() => {
                            onSelect(option.key);
                            onClose();
                        }}
                        accessibilityRole='radio'
                        accessibilityState={{ checked: option.key === selected }}
                        style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: theme.borderColor.val }}
                    >
                        <UIText flex={1} variant={option.key === selected ? 'bodyStrong' : 'body'}>
                            {option.label}
                        </UIText>
                        <YStack width={22} height={22} borderRadius={11} borderWidth={option.key === selected ? 7 : 2} borderColor={option.key === selected ? '$primary' : '$borderColor'} />
                    </Pressable>
                ))}
            </YStack>
        </Sheet>
    );
}
