import type { BrandingConfig } from './schema';

/** Identity helper that type-checks a storefront build's branding (storefront.brand.ts). */
export function defineBranding(config: BrandingConfig): BrandingConfig {
    return config;
}
