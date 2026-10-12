import { isColor } from './color';
import { PRESET_COLORS, isColorPreset, isSemanticColorKey } from './presets';
import type { ColorPreset, ColorScheme, SemanticColors } from './presets';
import type { ThemeSetInput } from './build-themes';

// Dependency-free resolution of the color inputs compiled into tamagui.config.ts.
//
// Tamagui's build-time extractor bundles the config with esbuild, which resolves
// some packages (including zod) to their type declarations in this repository.
// The config therefore must not import the zod-based resolver. This applies the
// same rules as resolveBranding() for colors; a test keeps the two in agreement.

const THEME_KEY = /^[a-zA-Z][a-zA-Z0-9]{0,39}$/;
const isPlainObject = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const isColorValue = (value: unknown): value is string => typeof value === 'string' && value.length <= 40 && isColor(value);

export function resolveThemeInputs(configs: unknown[]): ThemeSetInput {
    let preset: ColorPreset = 'blue';
    const overrides: Record<ColorScheme, Partial<SemanticColors>> = { light: {}, dark: {} };
    const extra: Record<'all' | ColorScheme, Record<string, string>> = { all: {}, light: {}, dark: {} };

    for (const config of configs) {
        if (!isPlainObject(config) || config.schemaVersion !== 1 || !isPlainObject(config.colors)) continue;
        const { colors } = config;
        if (isColorPreset(colors.preset)) preset = colors.preset;
        for (const scheme of ['light', 'dark'] as ColorScheme[]) {
            if (!isPlainObject(colors[scheme])) continue;
            for (const [key, value] of Object.entries(colors[scheme])) {
                if (isSemanticColorKey(key) && isColorValue(value)) overrides[scheme][key] = value;
            }
        }
        if (isPlainObject(colors.extra)) {
            for (const part of ['all', 'light', 'dark'] as const) {
                if (!isPlainObject(colors.extra[part])) continue;
                for (const [key, value] of Object.entries(colors.extra[part])) {
                    if (THEME_KEY.test(key) && isColorValue(value)) extra[part][key] = value;
                }
            }
        }
    }

    return {
        preset,
        colors: {
            light: { ...PRESET_COLORS[preset].light, ...overrides.light },
            dark: { ...PRESET_COLORS[preset].dark, ...overrides.dark },
        },
        extra: { light: { ...extra.all, ...extra.light }, dark: { ...extra.all, ...extra.dark } },
    };
}
