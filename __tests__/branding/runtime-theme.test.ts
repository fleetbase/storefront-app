import { ensureBrandTheme } from '../../src/branding/runtime-theme';
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
