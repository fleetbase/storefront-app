import { resolveBranding } from '../../src/branding/resolve';
import { PRESET_COLORS } from '../../src/branding/presets';

describe('resolveBranding', () => {
    test('merges sources in priority order', () => {
        const { branding } = resolveBranding([
            { name: 'env', config: { schemaVersion: 1, colors: { preset: 'indigo' }, components: { productCard: { variant: 'outlined' } } } },
            { name: 'brand', config: { schemaVersion: 1, components: { productCard: { variant: 'visio' } }, appearance: { allowUserToggle: false } } },
        ]);
        expect(branding.preset).toBe('indigo');
        expect(branding.colors.light).toEqual(PRESET_COLORS.indigo.light);
        expect(branding.components.productCard.variant).toBe('visio');
        expect(branding.appearance).toEqual({ defaultScheme: 'system', allowUserToggle: false });
    });

    test('rejects sources with an unsupported schema version or shape', () => {
        const { branding, issues } = resolveBranding([
            { name: 'future', config: { schemaVersion: 2, colors: { preset: 'red' } } },
            { name: 'broken', config: 'nope' },
        ]);
        expect(branding.preset).toBe('blue');
        expect(issues.map((issue) => issue.source)).toEqual(['future', 'broken']);
    });

    test('reports unknown sections and keys without failing', () => {
        const { branding, issues } = resolveBranding([{ name: 'brand', config: { schemaVersion: 1, fonts: {}, components: { productCard: { variant: 'visio', size: 'xl' } } } }]);
        // The unknown key is dropped; the valid sibling is kept.
        expect(branding.components.productCard.variant).toBe('visio');
        expect(issues.map((issue) => issue.path)).toEqual(expect.arrayContaining(['fonts', 'components.productCard.size']));
    });

    test('rejects non-https and malformed assets', () => {
        const { branding, issues } = resolveBranding([
            { name: 'remote', config: { schemaVersion: 1, assets: { loginBackground: { url: 'http://example.com/a.jpg' }, bootBackground: { bundled: 'missing_image' } } } },
        ]);
        expect(branding.assets.loginBackground).toEqual({ bundled: 'storefront_photo_1' });
        expect(branding.assets.bootBackground).toBeNull();
        expect(issues).toHaveLength(2);
    });

    test('accepts https assets and screen variant selections', () => {
        const { branding, issues } = resolveBranding([
            { name: 'brand', config: { schemaVersion: 1, assets: { loginBackground: { url: 'https://cdn.example.com/login.jpg' } }, screens: { 'store.home': { variant: 'editorial' }, 'nope.screen': { variant: 'x' } } } },
        ]);
        expect(branding.assets.loginBackground).toEqual({ url: 'https://cdn.example.com/login.jpg' });
        expect(branding.screens).toEqual({ 'store.home': { variant: 'editorial' } });
        expect(issues.map((issue) => issue.path)).toEqual(['screens.nope.screen']);
    });

    test('reports contrast failures without changing build-time colors', () => {
        const { branding, issues } = resolveBranding([{ name: 'brand', config: { schemaVersion: 1, colors: { light: { textPrimary: '#eeeeee' } } } }]);
        expect(branding.colors.light.textPrimary).toBe('#eeeeee');
        expect(issues.some((issue) => issue.path === 'colors.light.textPrimary/background')).toBe(true);
    });

    test('reverts failing overrides from sources that enforce contrast', () => {
        const { branding, issues } = resolveBranding([
            { name: 'remote', enforceContrast: true, config: { schemaVersion: 1, colors: { light: { textPrimary: '#eeeeee', primary: '#0f766e' } } } },
        ]);
        expect(branding.colors.light.textPrimary).toBe(PRESET_COLORS.blue.light.textPrimary);
        expect(branding.colors.light.primary).toBe('#0f766e');
        expect(issues.find((issue) => issue.path === 'colors.light.textPrimary/background')?.message).toMatch(/reverted/);
    });

    test('bundled presets meet the primary text contrast minimum', () => {
        const { issues } = resolveBranding([]);
        expect(issues.filter((issue) => issue.path.startsWith('colors.light.textPrimary') || issue.path.startsWith('colors.dark.textPrimary'))).toEqual([]);
    });
});
