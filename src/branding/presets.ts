import { trueveganDarkBase, trueveganLightBase } from '../../themes/true-vegan';
import { palette } from './palette';

/** Semantic theme keys every storefront theme defines. Components should style with these, not palette keys. */
export const SEMANTIC_COLOR_KEYS = [
    'background',
    'surface',
    'color',
    'textPrimary',
    'textSecondary',
    'textPlaceholder',
    'primary',
    'primaryBorder',
    'primaryText',
    'secondary',
    'secondaryBorder',
    'borderColor',
    'borderColorWithShadow',
    'shadowColor',
    'borderActive',
    'success',
    'error',
    'warning',
    'info',
    'successBorder',
    'errorBorder',
    'warningBorder',
    'infoBorder',
    'successText',
    'errorText',
    'warningText',
    'infoText',
] as const;

export type SemanticColorKey = (typeof SEMANTIC_COLOR_KEYS)[number];
export type SemanticColors = Record<SemanticColorKey, string>;
export type ColorScheme = 'light' | 'dark';

export const COLOR_PRESETS = ['blue', 'red', 'green', 'indigo', 'orange', 'truevegan'] as const;
export type ColorPreset = (typeof COLOR_PRESETS)[number];

const lightBase: SemanticColors = {
    background: palette.gray[50],
    surface: palette.gray[100],
    color: palette.gray[900],
    textPrimary: palette.gray[800],
    textSecondary: palette.gray[600],
    textPlaceholder: palette.gray[400],
    primary: palette.blue[500],
    primaryBorder: palette.blue[200],
    primaryText: palette.blue[900],
    secondary: palette.gray[200],
    secondaryBorder: palette.gray[500],
    borderColor: palette.gray[200],
    borderColorWithShadow: palette.gray[300],
    shadowColor: palette.gray[900],
    borderActive: palette.blue[600],
    success: palette.green[600],
    error: palette.red[600],
    warning: palette.yellow[600],
    info: palette.blue[600],
    successBorder: palette.green[700],
    errorBorder: palette.red[700],
    warningBorder: palette.yellow[700],
    infoBorder: palette.blue[700],
    successText: palette.green[100],
    errorText: palette.red[100],
    warningText: palette.yellow[100],
    infoText: palette.blue[100],
};

const darkBase: SemanticColors = {
    background: palette.gray[900],
    surface: palette.gray[800],
    color: palette.gray[50],
    textPrimary: palette.gray[200],
    textSecondary: palette.gray[400],
    textPlaceholder: palette.gray[600],
    primary: palette.blue[900],
    primaryBorder: palette.blue[600],
    primaryText: palette.blue[100],
    secondary: palette.gray[700],
    secondaryBorder: palette.gray[400],
    borderColor: palette.gray[800],
    borderColorWithShadow: palette.gray[700],
    shadowColor: '#000',
    borderActive: palette.blue[500],
    success: palette.green[900],
    error: palette.red[900],
    warning: palette.yellow[900],
    info: palette.blue[900],
    successBorder: palette.green[600],
    errorBorder: palette.red[600],
    warningBorder: palette.yellow[600],
    infoBorder: palette.blue[600],
    successText: palette.green[100],
    errorText: palette.red[100],
    warningText: palette.yellow[100],
    infoText: palette.blue[100],
};

const tailwindPreset = (scale: Record<number, string>) => ({
    light: { ...lightBase, primary: scale[600], primaryBorder: scale[700], primaryText: 'white' },
    dark: { ...darkBase, primary: scale[900], primaryBorder: scale[600], primaryText: scale[100] },
});

/** Semantic colors for each bundled preset. These reproduce the original storefront themes exactly. */
export const PRESET_COLORS: Record<ColorPreset, Record<ColorScheme, SemanticColors>> = {
    blue: tailwindPreset(palette.blue),
    red: tailwindPreset(palette.red),
    green: tailwindPreset(palette.green),
    indigo: tailwindPreset(palette.indigo),
    orange: tailwindPreset(palette.orange),
    truevegan: { light: pickSemantic(trueveganLightBase), dark: pickSemantic(trueveganDarkBase) },
};

function pickSemantic(source: Record<string, string>): SemanticColors {
    return Object.fromEntries(SEMANTIC_COLOR_KEYS.map((key) => [key, source[key]])) as SemanticColors;
}

export const isColorPreset = (value: unknown): value is ColorPreset => typeof value === 'string' && (COLOR_PRESETS as readonly string[]).includes(value);

export const isSemanticColorKey = (value: string): value is SemanticColorKey => (SEMANTIC_COLOR_KEYS as readonly string[]).includes(value);

/** Tamagui theme name for a preset and scheme, e.g. `lightBlue`. */
export const presetThemeName = (scheme: ColorScheme, preset: ColorPreset) => `${scheme}${preset.charAt(0).toUpperCase()}${preset.slice(1)}`;
