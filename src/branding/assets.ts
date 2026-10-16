import type { BundledAssetKey } from './asset-keys';
import type { AssetReference } from './schema';

const BUNDLED_ASSETS: Record<BundledAssetKey, number> = {
    storefront_photo_1: require('../../assets/images/storefront-photo-1.jpg'),
    storefront_photo_2: require('../../assets/images/storefront-photo-2.jpg'),
};

/** Converts a branding asset reference into an image source, or null when unset. */
export function resolveAssetSource(ref: AssetReference | null | undefined): number | { uri: string } | null {
    if (!ref) return null;
    if ('bundled' in ref && ref.bundled) return BUNDLED_ASSETS[ref.bundled as BundledAssetKey] ?? null;
    if ('url' in ref && ref.url) return { uri: ref.url };
    return null;
}
