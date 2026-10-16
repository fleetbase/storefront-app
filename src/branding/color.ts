export type Rgba = { r: number; g: number; b: number; a: number };

const NAMED_COLORS: Record<string, Rgba> = {
    white: { r: 255, g: 255, b: 255, a: 1 },
    black: { r: 0, g: 0, b: 0, a: 1 },
    transparent: { r: 0, g: 0, b: 0, a: 0 },
};

const clampChannel = (value: number) => Math.min(255, Math.max(0, Math.round(value)));

/** Parses #rgb, #rrggbb, #rrggbbaa, rgb(), rgba() and a few named colors. */
export function parseColor(value: unknown): Rgba | null {
    if (typeof value !== 'string') return null;
    const input = value.trim().toLowerCase();
    if (NAMED_COLORS[input]) return { ...NAMED_COLORS[input] };

    const hex = input.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/);
    if (hex) {
        let digits = hex[1];
        if (digits.length === 3) digits = digits.split('').map((d) => d + d).join('');
        const channel = (index: number) => parseInt(digits.slice(index, index + 2), 16);
        return { r: channel(0), g: channel(2), b: channel(4), a: digits.length === 8 ? channel(6) / 255 : 1 };
    }

    const rgb = input.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d+))?\s*\)$/);
    if (rgb) {
        const [r, g, b] = [rgb[1], rgb[2], rgb[3]].map(Number);
        if ([r, g, b].some((channel) => channel > 255)) return null;
        return { r, g, b, a: rgb[4] === undefined ? 1 : Number(rgb[4]) };
    }

    return null;
}

export const isColor = (value: unknown): value is string => parseColor(value) !== null;

export function toHex({ r, g, b, a }: Rgba): string {
    const hex = [r, g, b].map((channel) => clampChannel(channel).toString(16).padStart(2, '0')).join('');
    return a < 1 ? `#${hex}${clampChannel(a * 255).toString(16).padStart(2, '0')}` : `#${hex}`;
}

/** Mixes `from` toward `to` by `amount` (0..1). Falls back to `from` if either color is unparseable. */
export function mix(from: string, to: string, amount: number): string {
    const a = parseColor(from);
    const b = parseColor(to);
    if (!a || !b) return from;
    const t = Math.min(1, Math.max(0, amount));
    return toHex({
        r: a.r + (b.r - a.r) * t,
        g: a.g + (b.g - a.g) * t,
        b: a.b + (b.b - a.b) * t,
        a: a.a + (b.a - a.a) * t,
    });
}

function channelLuminance(channel: number) {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of an opaque color. */
export function relativeLuminance(color: string): number | null {
    const parsed = parseColor(color);
    if (!parsed) return null;
    return 0.2126 * channelLuminance(parsed.r) + 0.7152 * channelLuminance(parsed.g) + 0.0722 * channelLuminance(parsed.b);
}

/** WCAG contrast ratio (1..21), or null when either color cannot be parsed. */
export function contrastRatio(foreground: string, background: string): number | null {
    const l1 = relativeLuminance(foreground);
    const l2 = relativeLuminance(background);
    if (l1 === null || l2 === null) return null;
    const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (light + 0.05) / (dark + 0.05);
}
