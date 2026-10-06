import buildBrand from '../../storefront.brand';
import { config as readEnv } from '../utils/tamagui';
import { brandingFromLegacyEnv } from './legacy-env';
import { resolveBranding } from './resolve';
import type { BrandingIssue, BrandingSource, ResolvedBranding } from './resolve';

/**
 * Branding sources known at build time, lowest priority first. Remote,
 * published configuration is layered on top at runtime.
 */
export function getBuildBrandingSources(): BrandingSource[] {
    return [
        { name: 'legacy-env', config: brandingFromLegacyEnv((key) => readEnv(key, undefined)) },
        { name: 'storefront.brand.ts', config: buildBrand },
    ];
}

let cached: { branding: ResolvedBranding; issues: BrandingIssue[] } | null = null;

/** Resolved build-time branding. Shared by the Tamagui config and the app configuration. */
export function getBuildBranding() {
    cached = cached ?? resolveBranding(getBuildBrandingSources());
    return cached;
}
