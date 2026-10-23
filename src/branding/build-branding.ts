import buildBrand from '../generated/brand-config';
import { config as readEnv } from '../utils/tamagui';
import { brandingFromLegacyEnv } from './legacy-env';
import { resolveBranding } from './resolve';
import { initialHostedPreview } from '../preview/host';
import type { BrandingIssue, BrandingSource, ResolvedBranding } from './resolve';

/**
 * Branding sources known at build time, lowest priority first. Remote,
 * published configuration is layered on top at runtime.
 */
export function getBuildBrandingSources(): BrandingSource[] {
    return [
        { name: 'legacy-env', config: brandingFromLegacyEnv((key) => readEnv(key, undefined)) },
        { name: 'storefront.brand.ts', config: buildBrand },
        // A hosted preview's starting branding, so settings read at startup use it too.
        ...(initialHostedPreview?.branding ? [{ name: 'hosted-preview', config: initialHostedPreview.branding, enforceContrast: true }] : []),
    ];
}

let cached: { branding: ResolvedBranding; issues: BrandingIssue[] } | null = null;

/** Resolved build-time branding. Shared by the Tamagui config and the app configuration. */
export function getBuildBranding() {
    cached = cached ?? resolveBranding(getBuildBrandingSources());
    return cached;
}
