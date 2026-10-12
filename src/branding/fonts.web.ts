import { brandFontFiles } from '../generated/brand-fonts';
import { regularFace } from './typography';
import type { FontSpec, TypographyInput } from './typography';

const FORMATS: Record<string, string> = { ttf: 'truetype', otf: 'opentype', woff: 'woff', woff2: 'woff2' };
let registered = false;

function fontFace(family: string, url: string, weight?: string) {
    const format = FORMATS[url.split('?')[0].split('.').pop()?.toLowerCase() ?? ''];
    return `@font-face { font-family: '${family}'; src: url('${url}')${format ? ` format('${format}')` : ''}; font-weight: ${weight ?? 'normal'}; font-style: normal; font-display: swap; }`;
}

function rulesFor(spec: FontSpec): string[] {
    const rules: string[] = [];
    for (const [weight, name] of Object.entries(spec.faces)) {
        const url = brandFontFiles[name];
        if (!url) {
            console.warn(`[branding] Font "${name}" isn't in brand/fonts; text in that weight uses the fallback font.`);
            continue;
        }
        // The family name with every weight (CSS picks the weight), the regular face's
        // name the same way (Tamagui's family on native), and each face on its own.
        rules.push(fontFace(spec.family, url, weight), fontFace(regularFace(spec), url, weight), fontFace(name, url));
    }
    return rules;
}

/** Registers the brand fonts from brand/fonts with @font-face, once, before the first render. */
export function registerBrandFonts(typography: TypographyInput): void {
    if (registered || typeof document === 'undefined') return;
    registered = true;
    const rules = [typography.body, typography.heading].filter(Boolean).flatMap((spec) => rulesFor(spec as FontSpec));
    if (!rules.length) return;
    const style = document.createElement('style');
    style.setAttribute('data-brand-fonts', '');
    style.textContent = [...new Set(rules)].join('\n');
    document.head.appendChild(style);
}
