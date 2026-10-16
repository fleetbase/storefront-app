import React, { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { useTheme } from 'tamagui';
import { radius } from './tokens';

export type TextFieldProps = TextInputProps & { invalid?: boolean; height?: number };

/** A single-line input on the theme: hairline border, brand focus ring, error border when invalid. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField({ invalid = false, height = 48, style, onFocus, onBlur, ...props }, ref) {
    const theme = useTheme();
    const [focused, setFocused] = useState(false);
    const borderColor = invalid ? theme.errorForeground.val : focused ? theme.primary.val : theme.borderColor.val;

    return (
        <TextInput
            ref={ref}
            placeholderTextColor={theme.textPlaceholder.val}
            accessibilityState={{ disabled: props.editable === false }}
            onFocus={(event) => {
                setFocused(true);
                onFocus?.(event);
            }}
            onBlur={(event) => {
                setFocused(false);
                onBlur?.(event);
            }}
            style={[
                {
                    minHeight: height,
                    paddingHorizontal: 14,
                    paddingVertical: props.multiline ? 12 : 0,
                    borderRadius: radius.button,
                    borderWidth: focused || invalid ? 2 : 1,
                    borderColor,
                    backgroundColor: theme.background.val,
                    color: theme.textPrimary.val,
                    fontSize: 15,
                },
                style,
            ]}
            {...props}
        />
    );
});
