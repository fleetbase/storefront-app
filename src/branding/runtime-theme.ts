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
 * The CSS rule that applies a runtime theme's variables on web whatever the
 * browser's color scheme, built from the rules Tamagui generated for it.
 *
 * Tamagui puts a runtime theme's variables under `:root .t_<name>`, a descendant
 * of the root that never matches the root element itself, which carries the
 * theme class (`themeClassNameOnRoot`), and again under
 * `@media (prefers-color-scheme: light|dark)`. So a dark brand theme only applied
 * on a dark-mode browser: on a light-mode one the page lost its theme variables
 * while colors read in JS stayed dark, rendering half light and half dark.
 * postcss-tamagui-fix.js does the same for the compiled themes.
 */
export function rootThemeRule(name: string, cssRules: string[] | undefined): string | null {
    const themeRule = cssRules?.find((rule) => !rule.trimStart().startsWith('@') && !rule.includes('::selection'));
    const declarations = themeRule?.match(/\{([^{}]*)\}\s*$/)?.[1]?.trim();
    return declarations ? `.t_${name}{${declarations}}` : null;
}

function insertRootThemeRule(name: string, cssRules: string[] | undefined) {
    if (typeof document === 'undefined') return;
    const rule = rootThemeRule(name, cssRules);
    if (!rule) return;
    const id = `storefront_theme_${name}`;
    let style = document.getElementById(id);
    if (!style) {
        style = document.createElement('style');
        style.id = id;
        document.head.appendChild(style);
    }
    style.textContent = rule;
}

/**
 * Returns the theme to render for resolved brand colors. When they match the
 * theme compiled into the Tamagui config, that theme is used as is. Otherwise
 * (e.g. colors from published remote configuration) an equivalent theme is
 * registered at runtime with Tamagui's `addTheme`, which updates native theme
 * state and injects CSS variables on web (see `rootThemeRule`).
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
        insertRootThemeRule(name, register({ name, theme, insertCSS: true })?.cssRules);
        registered.set(name, signature);
    }
    return { name, theme };
}
