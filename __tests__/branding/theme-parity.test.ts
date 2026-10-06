import legacyThemes from './fixtures/legacy-themes.json';
import { buildThemeSet, THEME_NAMES } from '../../src/branding/build-themes';
import { PRESET_COLORS } from '../../src/branding/presets';

// The fixture was captured from the hand-written tamagui.config.ts themes before
// branding generated them. Every original key must keep its exact value.
const postcssFix = require('../../postcss-tamagui-fix.js');

describe('generated themes', () => {
    const themes = buildThemeSet({ preset: 'blue', colors: PRESET_COLORS.blue, extra: { light: {}, dark: {} } });

    test('keep every original theme key and value', () => {
        for (const [name, legacy] of Object.entries(legacyThemes as Record<string, Record<string, string>>)) {
            expect(themes[name]).toBeDefined();
            for (const [key, value] of Object.entries(legacy)) {
                expect([name, key, themes[name][key]]).toEqual([name, key, value]);
            }
        }
    });

    test('keep the historical theme order used by the web CSS post-processor', () => {
        expect(Object.keys(themes)).toEqual(Object.keys(legacyThemes));
        expect(THEME_NAMES).toEqual(Object.keys(legacyThemes));
        expect(postcssFix.THEME_NAMES).toEqual(THEME_NAMES);
    });

    test('add the interaction keys Tamagui components expect', () => {
        const theme = themes.lightBlue;
        for (const key of ['backgroundHover', 'backgroundPress', 'backgroundFocus', 'borderColorHover', 'borderColorFocus', 'placeholderColor', 'color1', 'color12']) {
            expect(theme[key]).toMatch(/^#|^rgba/);
        }
        expect(theme.color1).toBe('#f9fafb');
        expect(theme.color12).toBe('#111827');
    });

    test('apply brand overrides and extra keys only to the active preset', () => {
        const overridden = buildThemeSet({
            preset: 'truevegan',
            colors: { light: { ...PRESET_COLORS.truevegan.light, primary: '#123456' }, dark: PRESET_COLORS.truevegan.dark },
            extra: { light: { custom: '#345A73' }, dark: {} },
        });
        expect(overridden.lightTruevegan.primary).toBe('#123456');
        expect(overridden.lightTruevegan.custom).toBe('#345A73');
        expect(overridden.lightBlue.primary).toBe('#2563eb');
        expect(overridden.lightBlue.custom).toBeUndefined();
    });
});

test('tamagui.config compiles the generated themes', () => {
    const { themes } = require('../../tamagui.config');
    expect(Object.keys(themes)).toEqual(THEME_NAMES);
    expect(themes.lightBlue.primary).toBe('#2563eb');
});
