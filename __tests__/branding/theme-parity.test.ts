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

describe('supporting colors', () => {
    const themes = buildThemeSet({ preset: 'blue', colors: PRESET_COLORS.blue, extra: { light: {}, dark: {} } });
    const { contrastRatio } = require('../../src/branding/color');

    test('every theme gets the supporting surfaces the redesigned screens use', () => {
        for (const theme of Object.values(themes)) {
            for (const key of ['primaryForeground', 'surface2', 'primarySoft', 'successSoft', 'warningSoft', 'errorSoft', 'infoSoft', 'overlay']) {
                expect([key, theme[key]]).toEqual([key, expect.stringMatching(/^#|^rgba/)]);
            }
        }
    });

    test('brand-colored text stays readable on the background in light and dark themes', () => {
        for (const [name, theme] of Object.entries(themes)) {
            expect([name, contrastRatio(theme.primaryForeground, theme.background) >= 4.5]).toEqual([name, true]);
        }
        // A readable primary is used as-is.
        expect(themes.lightBlue.primaryForeground).toBe(themes.lightBlue.primary);
    });

    test('readableOn falls back to the text color when nothing else reads', () => {
        const { readableOn } = require('../../src/branding/build-themes');
        expect(readableOn('#777777', '#777777', '#777777')).toBe('#777777');
        expect(readableOn('not-a-color', '#ffffff', '#000000')).toBe('not-a-color');
    });
});
