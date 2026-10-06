import { brandingFromLegacyEnv } from '../../src/branding/legacy-env';
import { resolveBranding } from '../../src/branding/resolve';
import { resolveThemeInputs } from '../../src/branding/theme-inputs';

const CASES: Record<string, Record<string, string>> = {
    empty: {},
    'true-vegan': { APP_THEME: 'truevegan', CUSTOM_COLORS: 'custom:#345A73,customBorder:#345A73,customText:#F0EEEC' },
    semantic: { APP_THEME: 'indigo', CUSTOM_COLORS: 'primary:#0f766e,brand:#0f766e', CUSTOM_COLORS_DARK: 'primary:#14b8a6,brandDark:#115e59' },
    invalid: { APP_THEME: 'nope', CUSTOM_COLORS: 'primary:not-a-color,custom:#345A73,bad key:#fff', CUSTOM_COLORS_LIGHT: 'background:#zzzzzz' },
};

// tamagui.config.ts compiles themes from resolveThemeInputs; the app resolves the
// same sources with resolveBranding. They must agree or a redundant runtime theme is registered.
describe('resolveThemeInputs agrees with resolveBranding', () => {
    test.each(Object.keys(CASES))('%s', (name) => {
        const sources = [brandingFromLegacyEnv((key) => CASES[name][key]), { schemaVersion: 1, colors: { dark: { surface: '#0b1120' } } }];
        const inputs = resolveThemeInputs(sources);
        const { branding } = resolveBranding(sources.map((config, index) => ({ name: `source-${index}`, config })));
        expect(inputs.preset).toBe(branding.preset);
        expect(inputs.colors).toEqual(branding.colors);
        expect(inputs.extra).toEqual(branding.extraColors);
    });
});
