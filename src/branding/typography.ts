// Dependency-free typography helpers shared by tamagui.config.ts (which can't import the
// zod-based resolver, see theme-inputs.ts) and the app. The rules match TypographySchema.

export type FontSpec = { family: string; faces: Record<string, string> };
export type TypographyInput = { body?: FontSpec; heading?: FontSpec; scale: number };

const FAMILY = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$/;
const FACE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const WEIGHTS = ['100', '200', '300', '400', '500', '600', '700', '800', '900'];

const isPlainObject = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);

function fontSpec(value: unknown): FontSpec | undefined {
    if (!isPlainObject(value) || typeof value.family !== 'string' || !FAMILY.test(value.family) || !isPlainObject(value.faces)) return undefined;
    const faces = Object.fromEntries(Object.entries(value.faces).filter(([weight, name]) => WEIGHTS.includes(weight) && typeof name === 'string' && FACE.test(name)));
    return Object.keys(faces).length ? { family: value.family, faces: faces as Record<string, string> } : undefined;
}

/** The typography from branding sources, lowest priority first (invalid values are skipped). */
export function resolveTypographyInputs(configs: unknown[]): TypographyInput {
    const result: TypographyInput = { scale: 1 };
    for (const config of configs) {
        if (!isPlainObject(config) || config.schemaVersion !== 1 || !isPlainObject(config.typography)) continue;
        const { typography } = config;
        const body = fontSpec(typography.body);
        const heading = fontSpec(typography.heading);
        if (body) result.body = body;
        if (heading) result.heading = heading;
        if (typeof typography.scale === 'number' && typography.scale >= 0.85 && typography.scale <= 1.3) result.scale = typography.scale;
    }
    return result;
}

/** The face used for normal text: 400, else the nearest weight above it, else the first. */
export function regularFace(spec: FontSpec): string {
    const weights = Object.keys(spec.faces).sort();
    return spec.faces['400'] ?? spec.faces[weights.find((weight) => weight > '400') ?? weights[0]];
}

/**
 * Tamagui font fields for a brand font. Native apps pick a font file per weight through
 * `face` (files are linked by PostScript name); the family is the regular face so text
 * without a weight still uses the brand font. On the web the same names are registered
 * with @font-face (see fonts.web.ts).
 */
export function tamaguiFontFields(spec: FontSpec) {
    return {
        family: regularFace(spec),
        face: Object.fromEntries(Object.entries(spec.faces).map(([weight, name]) => [weight, { normal: name }])),
    };
}
