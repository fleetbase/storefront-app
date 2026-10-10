import { ZodEffects, ZodNullable, ZodObject, ZodOptional, ZodRecord } from 'zod';
import type { ZodTypeAny } from 'zod';
import { contrastRatio } from './color';
import { DEFAULT_BRANDING } from './defaults';
import { PRESET_COLORS } from './presets';
import type { ColorPreset, ColorScheme, SemanticColorKey, SemanticColors } from './presets';
import { BRANDING_SCHEMA_VERSION, BRANDING_SECTIONS } from './schema';
import type { AssetReference, BrandingConfig, BrandingScreens, BrandingSection, FontFamily, StoreHeaderOptions } from './schema';

export type BrandingSource = {
    /** Label used in issues, e.g. `defaults`, `legacy-env`, `storefront.brand.ts`, `remote`. */
    name: string;
    config: unknown;
    /** Replace overridden colors that fail contrast checks instead of only reporting them. */
    enforceContrast?: boolean;
};

export type BrandingIssue = { source: string; path: string; message: string };

export type ResolvedBranding = {
    schemaVersion: typeof BRANDING_SCHEMA_VERSION;
    name?: string;
    preset: ColorPreset;
    colors: Record<ColorScheme, SemanticColors>;
    extraColors: Record<ColorScheme, Record<string, string>>;
    appearance: { defaultScheme: 'system' | 'light' | 'dark'; allowUserToggle: boolean };
    components: {
        productCard: { variant: 'bordered' | 'outlined' | 'visio' };
        storeCategories: { display: 'grid' | 'pills' };
        storeHeader: Required<StoreHeaderOptions>;
    };
    assets: { loginBackground: AssetReference | null; bootBackground: AssetReference | null };
    boot: { background: string[] };
    navigation: { store: { tabs: string[]; defaultTab: string; tabBar: { background: string } }; home: 'store' | 'foodTrucks'; network: { foodTrucks: boolean } };
    typography: { body?: FontFamily; heading?: FontFamily; scale: number };
    screens: BrandingScreens;
};

/** Text/background pairs checked against WCAG AA (4.5:1 for body text, 3:1 for secondary text). */
export const CONTRAST_PAIRS: Array<[SemanticColorKey, SemanticColorKey, number]> = [
    ['textPrimary', 'background', 4.5],
    ['textPrimary', 'surface', 4.5],
    ['color', 'background', 4.5],
    ['primaryText', 'primary', 4.5],
    ['textSecondary', 'background', 3],
];

const isPlainObject = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);

// Values at these paths are replaced as a whole rather than merged (e.g. an
// asset `{ url }` must not inherit a lower layer's `{ bundled }`).
const ATOMIC_PATHS = [/^assets\.[^.]+$/, /^typography\.(body|heading)$/];

function deepMerge<T>(base: T, override: unknown, path = ''): T {
    if (!isPlainObject(base) || !isPlainObject(override)) return (override === undefined ? base : override) as T;
    const result: Record<string, any> = { ...base };
    for (const [key, value] of Object.entries(override)) {
        const childPath = path ? `${path}.${key}` : key;
        const atomic = ATOMIC_PATHS.some((pattern) => pattern.test(childPath));
        result[key] = !atomic && isPlainObject(value) && isPlainObject(result[key]) ? deepMerge(result[key], value, childPath) : value;
    }
    return result as T;
}

const describe = (error: any) => error.issues.map((issue: any) => `${issue.path.join('.') || '(value)'}: ${issue.message}`).join('; ');

function unwrap(schema: ZodTypeAny): ZodTypeAny {
    let current: any = schema;
    while (current instanceof ZodOptional || current instanceof ZodNullable || current instanceof ZodEffects) {
        current = current instanceof ZodEffects ? current.innerType() : current.unwrap();
    }
    return current;
}

/**
 * Validates a value against its schema. When an object or record is invalid,
 * each child is validated on its own so one bad value (e.g. an invalid color)
 * drops only that value instead of the whole section.
 */
function sanitize(schema: ZodTypeAny, value: unknown, path: string, source: string, issues: BrandingIssue[]): unknown {
    const parsed = schema.safeParse(value);
    if (parsed.success) return parsed.data;

    const inner = unwrap(schema);
    if (!isPlainObject(value) || !(inner instanceof ZodObject || inner instanceof ZodRecord)) {
        issues.push({ source, path, message: describe(parsed.error) });
        return undefined;
    }

    const kept: Record<string, any> = {};
    for (const [key, child] of Object.entries(value)) {
        const childPath = `${path}.${key}`;
        let childSchema: ZodTypeAny | undefined;
        if (inner instanceof ZodObject) {
            childSchema = (inner.shape as Record<string, ZodTypeAny>)[key];
        } else if (inner.keySchema.safeParse(key).success) {
            childSchema = inner.valueSchema;
        }
        if (!childSchema) {
            issues.push({ source, path: childPath, message: 'Unknown or invalid key' });
            continue;
        }
        const sanitizedChild = sanitize(childSchema, child, childPath, source, issues);
        if (sanitizedChild !== undefined) kept[key] = sanitizedChild;
    }

    // Re-check container-level rules (e.g. maximum entries) on what was kept.
    const recheck = schema.safeParse(kept);
    if (!recheck.success) {
        issues.push({ source, path, message: describe(recheck.error) });
        return undefined;
    }
    return Object.keys(kept).length ? recheck.data : undefined;
}

function sanitizeSection(section: BrandingSection, value: unknown, source: string, issues: BrandingIssue[]) {
    return sanitize(BRANDING_SECTIONS[section] as ZodTypeAny, value, section, source, issues);
}

function sanitizeSource(source: BrandingSource, issues: BrandingIssue[]): BrandingConfig | null {
    const { name, config } = source;
    if (!isPlainObject(config)) {
        issues.push({ source: name, path: '', message: 'Branding config must be an object' });
        return null;
    }
    if (config.schemaVersion !== BRANDING_SCHEMA_VERSION) {
        issues.push({ source: name, path: 'schemaVersion', message: `Unsupported schema version ${String(config.schemaVersion)}; expected ${BRANDING_SCHEMA_VERSION}` });
        return null;
    }

    const sanitized: BrandingConfig = { schemaVersion: BRANDING_SCHEMA_VERSION };
    for (const [key, value] of Object.entries(config)) {
        if (key === 'schemaVersion' || value === undefined) continue;
        if (key === 'name') {
            if (typeof value === 'string' && value.length <= 80) sanitized.name = value;
            else issues.push({ source: name, path: 'name', message: 'Expected a string of at most 80 characters' });
            continue;
        }
        if (!(key in BRANDING_SECTIONS)) {
            issues.push({ source: name, path: key, message: 'Unknown section' });
            continue;
        }
        const section = sanitizeSection(key as BrandingSection, value, name, issues);
        if (section !== undefined) (sanitized as any)[key] = section;
    }
    return sanitized;
}

/**
 * Resolves branding from sources in increasing priority (defaults are applied
 * first automatically). Invalid values are dropped per section with an issue,
 * so resolution always produces a complete, valid branding.
 */
export function resolveBranding(sources: BrandingSource[]): { branding: ResolvedBranding; issues: BrandingIssue[] } {
    const issues: BrandingIssue[] = [];
    let merged: any = DEFAULT_BRANDING;
    const colorOverrides: Record<ColorScheme, Partial<SemanticColors>> = { light: {}, dark: {} };
    const enforcedKeys: Record<ColorScheme, Set<string>> = { light: new Set(), dark: new Set() };

    for (const source of sources) {
        const sanitized = sanitizeSource(source, issues);
        if (!sanitized) continue;
        merged = deepMerge(merged, sanitized);
        for (const scheme of ['light', 'dark'] as ColorScheme[]) {
            const overrides = sanitized.colors?.[scheme] ?? {};
            Object.assign(colorOverrides[scheme], overrides);
            for (const key of Object.keys(overrides)) {
                if (source.enforceContrast) enforcedKeys[scheme].add(key);
                else enforcedKeys[scheme].delete(key);
            }
        }
    }

    const preset: ColorPreset = merged.colors.preset;
    const colors = {} as Record<ColorScheme, SemanticColors>;
    for (const scheme of ['light', 'dark'] as ColorScheme[]) {
        const presetColors = PRESET_COLORS[preset][scheme];
        const schemeColors: SemanticColors = { ...presetColors, ...colorOverrides[scheme] };
        for (const [foreground, background, minimum] of CONTRAST_PAIRS) {
            const ratio = contrastRatio(schemeColors[foreground], schemeColors[background]);
            if (ratio === null || ratio >= minimum) continue;
            const overridden = [foreground, background].filter((key) => key in colorOverrides[scheme]);
            const enforce = overridden.some((key) => enforcedKeys[scheme].has(key));
            issues.push({
                source: overridden.length ? 'colors' : `preset:${preset}`,
                path: `colors.${scheme}.${foreground}/${background}`,
                message: `Contrast ${ratio.toFixed(2)}:1 is below ${minimum}:1${enforce ? '; reverted to preset colors' : ''}`,
            });
            if (enforce) {
                for (const key of overridden) schemeColors[key as SemanticColorKey] = presetColors[key as SemanticColorKey];
            }
        }
        colors[scheme] = schemeColors;
    }

    const extra = merged.colors.extra ?? {};
    const branding: ResolvedBranding = {
        schemaVersion: BRANDING_SCHEMA_VERSION,
        name: merged.name,
        preset,
        colors,
        extraColors: { light: { ...extra.all, ...extra.light }, dark: { ...extra.all, ...extra.dark } },
        appearance: merged.appearance,
        components: merged.components,
        assets: merged.assets,
        boot: merged.boot,
        navigation: merged.navigation,
        typography: merged.typography,
        screens: merged.screens,
    };
    return { branding, issues };
}
