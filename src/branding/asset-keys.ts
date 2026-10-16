/** Keys of images bundled with the app that branding can reference as `{ bundled: key }`. See assets.ts. */
export const BUNDLED_ASSET_KEYS = ['storefront_photo_1', 'storefront_photo_2'] as const;
export type BundledAssetKey = (typeof BUNDLED_ASSET_KEYS)[number];
