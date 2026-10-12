import buildBrand from '../../src/generated/brand-config';
import { resolveBranding } from '../../src/branding/resolve';

// CI guard: the build's branding (brand/storefront.brand.ts, or the root template) must resolve without validation or contrast issues.
test('storefront.brand.ts is valid branding', () => {
    const { issues } = resolveBranding([{ name: 'storefront.brand.ts', config: buildBrand }]);
    expect(issues).toEqual([]);
});
