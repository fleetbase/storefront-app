import { addTheme } from 'tamagui';
import { buildTheme } from './build-themes';
import type { ThemeColors } from './build-themes';
import type { SemanticColors } from './presets';

type ActiveTheme = { name: string; theme: ThemeColors };

let active: ActiveTheme | null = null;

/**
 * The theme currently rendered by BrandingProvider. Non-React code (navigator
 * option factories, toast styles) reads it through `getTheme()` in utils.
 */
export const getActiveTheme = () => active;

export function setActiveTheme(next: ActiveTheme) {
    active = next;
}

const registered = new Map<string, string>();

/**
 * Returns the theme to render for resolved brand colors. When they match the
 * theme compiled into the Tamagui config, that theme is used as is. Otherwise
 * (e.g. colors from published remote configuration) an equivalent theme is
 * registered at runtime with Tamagui's `addTheme`, which updates native theme
 * state and injects CSS variables on web.
 */
export function ensureBrandTheme({
    compiledName,
    compiledTheme,
    colors,
    extra,
    register = addTheme,
}: {
    compiledName: string;
    compiledTheme: ThemeColors | undefined;
    colors: SemanticColors;
    extra: ThemeColors;
    register?: typeof addTheme;
}): ActiveTheme {
    const theme = buildTheme(colors, extra);
    const matchesCompiled = !!compiledTheme && Object.entries(theme).every(([key, value]) => compiledTheme[key] === value);
    if (matchesCompiled) return { name: compiledName, theme: compiledTheme };

    const name = `${compiledName}Brand`;
    const signature = JSON.stringify(theme);
    if (registered.get(name) !== signature) {
        register({ name, theme, insertCSS: true });
        registered.set(name, signature);
    }
    return { name, theme };
}
