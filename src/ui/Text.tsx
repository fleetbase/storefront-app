import { styled, Text } from 'tamagui';

/**
 * Text with semantic variants. Screens pick a variant and tone instead of setting
 * sizes and colors, so a brand restyles type in one place.
 */
export const UIText = styled(Text, {
    name: 'UIText',
    color: '$textPrimary',
    maxFontSizeMultiplier: 1.8,
    variants: {
        variant: {
            display: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },
            title: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.4 },
            heading: { fontSize: 19, lineHeight: 24, fontWeight: '800', letterSpacing: -0.2 },
            subheading: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
            body: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
            bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
            caption: { fontSize: 13, lineHeight: 18, fontWeight: '500', maxFontSizeMultiplier: 1.6 },
            captionStrong: { fontSize: 13, lineHeight: 18, fontWeight: '700', maxFontSizeMultiplier: 1.6 },
            label: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', maxFontSizeMultiplier: 1.6 },
        },
        tone: {
            primary: { color: '$textPrimary' },
            secondary: { color: '$textSecondary' },
            placeholder: { color: '$textPlaceholder' },
            brand: { color: '$primaryForeground' },
            success: { color: '$success' },
            warning: { color: '$warning' },
            error: { color: '$error' },
            onPrimary: { color: '$primaryText' },
            onImage: { color: '#ffffff' },
        },
    } as const,
    defaultVariants: {
        variant: 'body',
        tone: 'primary',
    },
});

export type UITextProps = React.ComponentProps<typeof UIText>;
