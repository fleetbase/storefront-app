import { config as baseConfig } from '@tamagui/config/v3';
import { createTamagui, createTokens } from 'tamagui';
import { flattenPalette, globalColors } from './src/branding/palette';
import { buildThemeSet } from './src/branding/build-themes';
import { brandingFromLegacyEnv } from './src/branding/legacy-env';
import { resolveThemeInputs } from './src/branding/theme-inputs';
import { config as readEnv } from './src/utils/tamagui';
import buildBrand from './storefront.brand';

// Themes are generated from the build's branding (the legacy APP_THEME /
// CUSTOM_COLORS* env keys, then storefront.brand.ts). One light/dark pair is
// compiled per bundled color preset; the active preset carries the brand's
// overrides. See src/branding/theme-inputs.ts for why this avoids the zod resolver.
export const themes = buildThemeSet(resolveThemeInputs([brandingFromLegacyEnv((key) => readEnv(key, undefined)), buildBrand]));

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
