import { styled, Text } from 'tamagui';
import { getBuildBranding } from '../branding/build-branding';

// The brand's type scale (typography.scale) and heading font (typography.heading).
const { typography } = getBuildBranding().branding;
const size = (value: number) => Math.round(value * (typography.scale ?? 1));
const HEADING = typography.heading ? ({ fontFamily: '$heading' } as const) : {};

/**
 * Text with semantic variants. Screens pick a variant and tone instead of setting
 * sizes and colors, so a brand restyles type in one place.
 */
export const UIText = styled(Text, {
    name: 'UIText',
    color: '$textPrimary',
    maxFontSizeMultiplier: 1.8,
    // On the web, pressables with the button role render as <button>, whose default
    // `text-align: center` would otherwise be inherited by text inside cards and rows.
    '$platform-web': { textAlign: 'start' as any },
    variants: {
        variant: {
            display: { ...HEADING, fontSize: size(30), lineHeight: size(36), fontWeight: '800', letterSpacing: -0.6 },
            title: { ...HEADING, fontSize: size(24), lineHeight: size(30), fontWeight: '800', letterSpacing: -0.4 },
            heading: { ...HEADING, fontSize: size(19), lineHeight: size(24), fontWeight: '800', letterSpacing: -0.2 },
            subheading: { fontSize: size(16), lineHeight: size(22), fontWeight: '700' },
            body: { fontSize: size(15), lineHeight: size(22), fontWeight: '500' },
            bodyStrong: { fontSize: size(15), lineHeight: size(22), fontWeight: '700' },
            caption: { fontSize: size(13), lineHeight: size(18), fontWeight: '500', maxFontSizeMultiplier: 1.6 },
            captionStrong: { fontSize: size(13), lineHeight: size(18), fontWeight: '700', maxFontSizeMultiplier: 1.6 },
            label: { fontSize: size(12), lineHeight: size(16), fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', maxFontSizeMultiplier: 1.6 },
        },
        tone: {
            primary: { color: '$textPrimary' },
            secondary: { color: '$textSecondary' },
            placeholder: { color: '$textPlaceholder' },
            brand: { color: '$primaryForeground' },
            success: { color: '$successForeground' },
            warning: { color: '$warningForeground' },
            error: { color: '$errorForeground' },
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
