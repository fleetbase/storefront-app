import buildBrand from '../../storefront.brand';
import { resolveBranding } from '../../src/branding/resolve';

// CI guard: the committed build branding must resolve without validation or contrast issues.
test('storefront.brand.ts is valid branding', () => {
    const { issues } = resolveBranding([{ name: 'storefront.brand.ts', config: buildBrand }]);
    expect(issues).toEqual([]);
});
