import { config as baseConfig } from '@tamagui/config/v3';
import { createFont, createTamagui, createTokens } from 'tamagui';
import { flattenPalette, globalColors } from './src/branding/palette';
import { buildThemeSet } from './src/branding/build-themes';
import { brandingFromLegacyEnv } from './src/branding/legacy-env';
import { resolveThemeInputs } from './src/branding/theme-inputs';
import { resolveTypographyInputs, tamaguiFontFields } from './src/branding/typography';
import { config as readEnv } from './src/utils/tamagui';
import buildBrand from './src/generated/brand-config';

// Themes are generated from the build's branding (the legacy APP_THEME /
// CUSTOM_COLORS* env keys, then storefront.brand.ts). One light/dark pair is
// compiled per bundled color preset; the active preset carries the brand's
// overrides. See src/branding/theme-inputs.ts for why this avoids the zod resolver.
const brandSources = [brandingFromLegacyEnv((key) => readEnv(key, undefined)), buildBrand];
export const themes = buildThemeSet(resolveThemeInputs(brandSources));

// Brand fonts (typography.body / .heading) replace Inter for body and heading text,
// keeping the base sizes, line heights and letter spacing.
const typography = resolveTypographyInputs(brandSources);
const bodyFont = typography.body ? createFont({ ...baseConfig.fonts.body, ...tamaguiFontFields(typography.body) }) : baseConfig.fonts.body;
const headingSpec = typography.heading ?? typography.body;
const headingFont = headingSpec ? createFont({ ...baseConfig.fonts.heading, ...tamaguiFontFields(headingSpec) }) : baseConfig.fonts.heading;

const tokens = createTokens({
    ...baseConfig.tokens,
    color: {
        ...globalColors,
        ...flattenPalette(),
    },
});

const appConfig = createTamagui({
    ...baseConfig,
    themes,
    tokens,
    fonts: {
        ...baseConfig.fonts,
        body: bodyFont,
        heading: headingFont,
    },
    settings: {
        ...baseConfig.settings,
        themeClassNameOnRoot: true,
    },
});

export type AppConfig = typeof appConfig;

declare module 'tamagui' {
    interface TamaguiCustomConfig extends AppConfig {}
}

export default appConfig;
