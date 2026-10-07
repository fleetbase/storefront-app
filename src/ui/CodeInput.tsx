import React, { useRef, useState } from 'react';
import { Pressable, TextInput } from 'react-native';
import { XStack, YStack, useTheme } from 'tamagui';
import { UIText } from './Text';
import { radius } from './tokens';

/**
 * A one-time code entered into boxes. One hidden text field takes the input so paste and
 * SMS autofill work; `onComplete` fires when every box is filled.
 */
export function CodeInput({ value, onChange, onComplete, length = 6, invalid = false, label, autoFocus = true }: { value: string; onChange: (code: string) => void; onComplete?: (code: string) => void; length?: number; invalid?: boolean; label: string; autoFocus?: boolean }) {
    const theme = useTheme();
    const input = useRef<TextInput>(null);
    const [focused, setFocused] = useState(false);

    const change = (text: string) => {
        const code = text.replace(/\D/g, '').slice(0, length);
        onChange(code);
        if (code.length === length) onComplete?.(code);
    };

    return (
        <Pressable onPress={() => input.current?.focus()} accessibilityRole='none'>
            <XStack gap={8}>
                {Array.from({ length }).map((_, index) => {
                    const active = focused && (index === value.length || (index === length - 1 && value.length === length));
                    return (
                        <YStack
                            key={index}
                            flex={1}
                            height={60}
                            borderRadius={radius.button}
                            borderWidth={2}
                            borderColor={invalid ? '$errorForeground' : active ? '$primary' : value[index] ? '$borderColorWithShadow' : '$borderColor'}
                            alignItems='center'
                            justifyContent='center'
                            backgroundColor='$background'
                        >
                            <UIText variant='title'>{value[index] ?? ''}</UIText>
                        </YStack>
                    );
                })}
            </XStack>
            <TextInput
                ref={input}
                value={value}
                onChangeText={change}
                keyboardType='number-pad'
                textContentType='oneTimeCode'
                autoComplete='sms-otp'
                maxLength={length}
                autoFocus={autoFocus}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                accessibilityLabel={label}
                caretHidden
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.01, color: theme.background.val }}
            />
        </Pressable>
    );
}
