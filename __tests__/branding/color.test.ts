import { contrastRatio, isColor, mix, parseColor, toHex } from '../../src/branding/color';

describe('color helpers', () => {
    test('parse hex, rgb(a) and named colors', () => {
        expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
        expect(parseColor('#345A73')).toEqual({ r: 52, g: 90, b: 115, a: 1 });
        expect(parseColor('#00000080')?.a).toBeCloseTo(0.5, 2);
        expect(parseColor('rgba(0,0,0,0)')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
        expect(parseColor('white')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    });

    test('reject invalid colors', () => {
        for (const value of ['red', '#12', 'rgb(300,0,0)', '', 'javascript:alert(1)', 42, null]) {
            expect(isColor(value)).toBe(false);
        }
    });

    test('mix and format colors', () => {
        expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
        expect(mix('#000000', '#ffffff', 0)).toBe('#000000');
        expect(mix('not-a-color', '#ffffff', 0.5)).toBe('not-a-color');
        expect(toHex({ r: 255, g: 0, b: 0, a: 1 })).toBe('#ff0000');
    });

    test('compute WCAG contrast ratios', () => {
        expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
        expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
        expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio('nope', '#ffffff')).toBeNull();
    });
});
