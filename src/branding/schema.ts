import { z } from 'zod';
import { isColor } from './color';
import { COLOR_PRESETS, SEMANTIC_COLOR_KEYS } from './presets';
import { SCREEN_IDS } from '../extensions/screens/screen-ids';
import { BUNDLED_ASSET_KEYS } from './asset-keys';

/**
 * Branding configuration, schema version 1.
 *
 * Everything here is declarative data: it may come from the build
 * (storefront.brand.ts), the legacy environment keys, or later a published
 * remote configuration. It never contains code. New optional fields may be
 * added to v1; removing or changing the meaning of a field requires v2 plus a
 * migration in migrations.ts.
 */
export const BRANDING_SCHEMA_VERSION = 1 as const;

export const HOME_SCREENS = ['store', 'foodTrucks'] as const;
export const STORE_TABS = ['StoreHomeTab', 'StoreSearchTab', 'StoreMapTab', 'StoreCartTab', 'StoreProfileTab', 'StoreFoodTruckTab'] as const;

export const ColorValue = z.string().max(40).refine(isColor, { message: 'Expected a hex, rgb()/rgba() or named (white, black, transparent) color' });

/** Theme key name used for extra brand colors, e.g. `custom`, `customBorder`. */
const ThemeKey = z.string().regex(/^[a-zA-Z][a-zA-Z0-9]{0,39}$/, 'Expected an alphanumeric theme key');

/** A theme color key or `$token` reference. */
const ColorOrToken = z.union([ColorValue, z.string().regex(/^\$[a-zA-Z][a-zA-Z0-9-]{0,39}$/)]);

const SemanticColorsSchema = z
    .object(Object.fromEntries(SEMANTIC_COLOR_KEYS.map((key) => [key, ColorValue])) as Record<(typeof SEMANTIC_COLOR_KEYS)[number], typeof ColorValue>)
    .partial()
    .strict();

const ExtraColorsSchema = z.record(ThemeKey, ColorValue).refine((value) => Object.keys(value).length <= 50, 'At most 50 extra colors');

export const ColorsSchema = z
    .object({
        preset: z.enum(COLOR_PRESETS),
        light: SemanticColorsSchema,
        dark: SemanticColorsSchema,
        /** Additional theme keys (e.g. for a custom tab bar color), applied to both, light or dark schemes. */
        extra: z.object({ all: ExtraColorsSchema, light: ExtraColorsSchema, dark: ExtraColorsSchema }).partial().strict(),
    })
    .partial()
    .strict();

export const AppearanceSchema = z
    .object({
        defaultScheme: z.enum(['system', 'light', 'dark']),
        allowUserToggle: z.boolean(),
    })
    .partial()
    .strict();

const Spacing = z.union([z.number().min(0).max(64), z.string().regex(/^\$\d{1,2}$/)]);

export const StoreHeaderSchema = z
    .object({
        showGradient: z.boolean(),
        showLocationPicker: z.boolean(),
        showTitle: z.boolean(),
        showDescription: z.boolean(),
        showLogo: z.boolean(),
        logoHeight: z.number().int().min(16).max(240),
        logoWidth: z.number().int().min(16).max(240),
        direction: z.enum(['row', 'column']),
        alignItems: z.enum(['flex-start', 'center', 'flex-end', 'stretch']),
        justifyContent: z.enum(['flex-start', 'center', 'flex-end', 'space-between', 'space-around']),
        spacing: Spacing,
        paddingTop: Spacing,
        paddingBottom: Spacing,
        paddingLeft: Spacing,
        paddingRight: Spacing,
    })
    .partial()
    .strict();

export const ComponentsSchema = z
    .object({
        productCard: z.object({ variant: z.enum(['bordered', 'outlined', 'visio']) }).partial().strict(),
        storeCategories: z.object({ display: z.enum(['grid', 'pills']) }).partial().strict(),
        storeHeader: StoreHeaderSchema,
    })
    .partial()
    .strict();

/** A bundled asset key (see assets.ts) or an https URL. */
export const AssetRef = z.union([
    z.object({ bundled: z.enum(BUNDLED_ASSET_KEYS) }).strict(),
    z.object({ url: z.string().url().max(2048).startsWith('https://') }).strict(),
]);

export const AssetsSchema = z
    .object({
        loginBackground: AssetRef.nullable(),
        bootBackground: AssetRef.nullable(),
    })
    .partial()
    .strict();

export const BootSchema = z
    .object({
        /** One color renders a solid background; several render a vertical gradient. */
        background: z.array(ColorOrToken).min(1).max(4),
    })
    .partial()
    .strict();

export const NavigationSchema = z
    .object({
        store: z
            .object({
                tabs: z.array(z.enum(STORE_TABS)).min(1).max(6),
                defaultTab: z.enum(STORE_TABS),
                tabBar: z.object({ background: z.union([z.literal('blur'), ThemeKey]) }).partial().strict(),
            })
            .partial()
            .strict(),
        /** The app's first screen: the store (or Network) home, or the food trucks map. */
        home: z.enum(HOME_SCREENS),
        network: z
            .object({
                /** Show the Trucks tab in a Network (always shown when it is the home screen). */
                foodTrucks: z.boolean(),
            })
            .partial()
            .strict(),
    })
    .partial()
    .strict();

export const ScreensSchema = z.record(z.enum(SCREEN_IDS), z.object({ variant: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/) }).strict());

export const BRANDING_SECTIONS = {
    colors: ColorsSchema,
    appearance: AppearanceSchema,
    components: ComponentsSchema,
    assets: AssetsSchema,
    boot: BootSchema,
    navigation: NavigationSchema,
    screens: ScreensSchema,
} as const;

export type BrandingSection = keyof typeof BRANDING_SECTIONS;

export const BrandingSchemaV1 = z
    .object({
        schemaVersion: z.literal(BRANDING_SCHEMA_VERSION),
        name: z.string().max(80).optional(),
        ...Object.fromEntries(Object.entries(BRANDING_SECTIONS).map(([key, schema]) => [key, schema.optional()])),
    })
    .strict();

export type BrandingColors = z.infer<typeof ColorsSchema>;
export type BrandingAppearance = z.infer<typeof AppearanceSchema>;
export type BrandingComponents = z.infer<typeof ComponentsSchema>;
export type BrandingAssets = z.infer<typeof AssetsSchema>;
export type BrandingBoot = z.infer<typeof BootSchema>;
export type BrandingNavigation = z.infer<typeof NavigationSchema>;
export type BrandingScreens = z.infer<typeof ScreensSchema>;
export type StoreHeaderOptions = z.infer<typeof StoreHeaderSchema>;
export type AssetReference = z.infer<typeof AssetRef>;

/** Branding input from one source. Every section is optional and merges over lower-priority sources. */
export type BrandingConfig = {
    schemaVersion: typeof BRANDING_SCHEMA_VERSION;
    name?: string;
    colors?: BrandingColors;
    appearance?: BrandingAppearance;
    components?: BrandingComponents;
    assets?: BrandingAssets;
    boot?: BrandingBoot;
    navigation?: BrandingNavigation;
    screens?: BrandingScreens;
};
