import * as tamaguiWeb from '@tamagui/web';
import config from '../../tamagui.config';
import { ensureBrandTheme, rootThemeRule } from '../../src/branding/runtime-theme';
import { buildTheme } from '../../src/branding/build-themes';
import { PRESET_COLORS } from '../../src/branding/presets';

describe('ensureBrandTheme', () => {
    const compiledTheme = buildTheme(PRESET_COLORS.blue.light);

    test('uses the compiled theme when colors match', () => {
        const register = jest.fn();
        const result = ensureBrandTheme({ compiledName: 'lightBlue', compiledTheme, colors: PRESET_COLORS.blue.light, extra: {}, register });
        expect(result.name).toBe('lightBlue');
        expect(register).not.toHaveBeenCalled();
    });

    test('registers a runtime theme once per distinct color set', () => {
        const register = jest.fn();
        const colors = { ...PRESET_COLORS.blue.light, primary: '#7c3aed' };
        const first = ensureBrandTheme({ compiledName: 'lightBlue', compiledTheme, colors, extra: {}, register });
        ensureBrandTheme({ compiledName: 'lightBlue', compiledTheme, colors, extra: {}, register });
        expect(first.name).toBe('lightBlueBrand');
        expect(first.theme.primary).toBe('#7c3aed');
        expect(register).toHaveBeenCalledTimes(1);
        expect(register).toHaveBeenCalledWith(expect.objectContaining({ name: 'lightBlueBrand', insertCSS: true }));

        ensureBrandTheme({ compiledName: 'lightBlue', compiledTheme, colors: { ...colors, primary: '#be185d' }, extra: {}, register });
        expect(register).toHaveBeenCalledTimes(2);
    });
});

describe('runtime themes on web', () => {
    // Typed as the native no-op under this project's module suffixes; Jest loads the web build.
    const getThemeCSSRules = tamaguiWeb.getThemeCSSRules as unknown as (props: { config: unknown; themeName: string; theme: unknown; names: string[]; hasDarkLight?: boolean }) => string[];

    // The rules Tamagui's addTheme injects for a runtime theme.
    const tamaguiRules = (name: string, colors: Record<string, string>) => {
        const theme: Record<string, any> = { ...colors };
        for (const key in theme) tamaguiWeb.ensureThemeVariable(theme, key);
        return getThemeCSSRules({ config, themeName: name, names: [name], hasDarkLight: true, theme });
    };

    test("Tamagui's rules alone only reach the root class under a matching prefers-color-scheme", () => {
        const rules = tamaguiRules('darkBlueBrand', { background: '#111827' });
        const unconditional = rules.filter((rule) => !rule.startsWith('@'));
        expect(unconditional.every((rule) => !/(^|,)\s*\.t_darkBlueBrand\s*[,{]/.test(rule))).toBe(true);
        expect(rules.find((rule) => rule.includes('.t_darkBlueBrand {'))).toMatch(/^@media\(prefers-color-scheme:dark\)/);
    });

    test('applies the theme variables to the root class whatever the browser scheme', () => {
        const rules = tamaguiRules('darkBlueBrand', { background: '#111827', primary: '#9d174d' });
        expect(rootThemeRule('darkBlueBrand', rules)).toBe('.t_darkBlueBrand{--background:var(--c-gray-900);--primary:var(--c-pink-800);}');
        expect(rootThemeRule('darkBlueBrand', undefined)).toBeNull();
    });

    test('ensureBrandTheme adds the root rule to the page', () => {
        const styles = new Map<string, { id: string; textContent: string }>();
        (global as any).document = {
            getElementById: (id: string) => styles.get(id) ?? null,
            createElement: () => ({ id: '', textContent: '' }),
            head: { appendChild: (style: { id: string; textContent: string }) => styles.set(style.id, style) },
        };
        try {
            const colors = { ...PRESET_COLORS.blue.dark, primary: '#9d174d' };
            const register = jest.fn(({ name, theme }) => ({ cssRules: tamaguiRules(name, theme) }));
            const { name } = ensureBrandTheme({ compiledName: 'darkBlue', compiledTheme: buildTheme(PRESET_COLORS.blue.dark), colors, extra: {}, register: register as any });

            expect(name).toBe('darkBlueBrand');
            expect(styles.get('storefront_theme_darkBlueBrand')?.textContent).toMatch(/^\.t_darkBlueBrand\{--background:[^;]+;.*--primary:var\(--c-pink-800\);/);
        } finally {
            delete (global as any).document;
        }
    });
});
