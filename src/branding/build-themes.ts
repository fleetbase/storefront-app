import { mix } from './color';
import { flattenPalette, globalColors } from './palette';
import { COLOR_PRESETS, PRESET_COLORS, presetThemeName } from './presets';
import type { ColorPreset, ColorScheme, SemanticColors } from './presets';

export type ThemeColors = Record<string, string>;

const SCALE_STEPS = [0, 0.03, 0.06, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.7, 0.85, 1];

/**
 * Keys Tamagui's built-in components read (hover/press/focus states, placeholder,
 * outline and the color1..12 scale). Derived from the semantic colors so every
 * brand gets consistent interaction states.
 */
export function interactionColors(colors: SemanticColors): ThemeColors {
    const { background, color, borderColor, borderActive, textPlaceholder, surface } = colors;
    const scale = Object.fromEntries(SCALE_STEPS.map((step, index) => [`color${index + 1}`, mix(background, color, step)]));
    return {
        backgroundHover: mix(background, color, 0.04),
        backgroundPress: mix(background, color, 0.08),
        backgroundFocus: mix(background, color, 0.06),
        backgroundStrong: surface,
        backgroundTransparent: 'rgba(0,0,0,0)',
        colorHover: color,
        colorPress: mix(color, background, 0.15),
        colorFocus: color,
        colorTransparent: 'rgba(0,0,0,0)',
        borderColorHover: mix(borderColor, color, 0.15),
        borderColorPress: mix(borderColor, color, 0.25),
        borderColorFocus: borderActive,
        placeholderColor: textPlaceholder,
        outlineColor: borderActive,
        ...scale,
    };
}

/**
 * Builds a complete Tamagui theme: semantic colors, extra brand keys, the shared
 * palette (so `$gray-500` style keys keep working) and derived interaction keys.
 */
export function buildTheme(colors: SemanticColors, extra: ThemeColors = {}): ThemeColors {
    return {
        ...colors,
        ...globalColors,
        ...extra,
        ...flattenPalette(),
        ...interactionColors(colors),
    };
}

export type ThemeSetInput = {
    /** Active preset, whose themes receive the brand's color overrides. */
    preset: ColorPreset;
    colors: Record<ColorScheme, SemanticColors>;
    extra: Record<ColorScheme, ThemeColors>;
};

/**
 * Builds the named themes compiled into the Tamagui config: one light/dark pair
 * per bundled preset. The active preset's pair carries the build's brand colors.
 */
export function buildThemeSet({ preset, colors, extra }: ThemeSetInput): Record<string, ThemeColors> {
    const themes: Record<string, ThemeColors> = {};
    for (const [scheme, name] of THEME_ORDER) {
        const isActive = name === preset;
        themes[presetThemeName(scheme, name)] = buildTheme(isActive ? colors[scheme] : PRESET_COLORS[name][scheme], isActive ? extra[scheme] : {});
    }
    return themes;
}

// Historical theme order. The web CSS post-processor (postcss-tamagui-fix.js) maps
// generated CSS rules to theme names by position, so this order must not change.
const GENERIC_PRESETS = COLOR_PRESETS.filter((name) => name !== 'truevegan');
export const THEME_ORDER: Array<[ColorScheme, ColorPreset]> = [
    ...GENERIC_PRESETS.map((name): [ColorScheme, ColorPreset] => ['light', name]),
    ...GENERIC_PRESETS.map((name): [ColorScheme, ColorPreset] => ['dark', name]),
    ['light', 'truevegan'],
    ['dark', 'truevegan'],
];

export const THEME_NAMES = THEME_ORDER.map(([scheme, name]) => presetThemeName(scheme, name));
