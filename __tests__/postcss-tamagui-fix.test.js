import postcss from 'postcss';

const postcssTamaguiFix = require('../postcss-tamagui-fix.js');

const { THEME_NAMES } = postcssTamaguiFix;
const FALLBACK_SELECTOR = ':where(:root:not([class*="t_light"]):not([class*="t_dark"]))';

// Mirrors Tamagui's web output for one theme: an unconditional rule whose first
// selector is empty, followed by a colour scheme media query with an empty rule.
const themeBlock = (name, index) => {
    const scheme = name.startsWith('dark') ? 'dark' : 'light';
    const vars = `--primary:#${String(index).padStart(6, '0')};--background:${scheme === 'dark' ? '#000' : '#fff'};`;
    return [
        `, .tm_xxt {${vars}}`,
        `@media(prefers-color-scheme:${scheme}){`,
        '    body{background:var(--background);color:var(--color)}',
        `     {${vars}}`,
        '  }',
        `.t_${name} ::selection{background:var(--color5);color:var(--color11)}`,
    ].join('\n');
};

const FIXTURE = [':root {--c-white:#FFFFFF;}', '._dsp_contents {display:contents;}', ...THEME_NAMES.map(themeBlock)].join('\n');

const run = (css) => postcss([postcssTamaguiFix()]).process(css, { from: undefined }).css;

const declarations = (rule) => Object.fromEntries(rule.nodes.filter((node) => node.type === 'decl').map((decl) => [decl.prop, decl.value]));

describe('postcss-tamagui-fix', () => {
    const output = run(FIXTURE);
    const root = postcss.parse(output);
    const topLevelRules = root.nodes.filter((node) => node.type === 'rule');
    const colorSchemeMedia = root.nodes.filter((node) => node.type === 'atrule' && node.name === 'media');

    test('gives every theme an unconditional .t_<theme> rule', () => {
        THEME_NAMES.forEach((name, index) => {
            const rule = topLevelRules.find((node) => node.selector === `.t_${name}`);
            expect([name, rule && declarations(rule)['--primary']]).toEqual([name, `#${String(index).padStart(6, '0')}`]);
        });
    });

    test('leaves no empty selectors or .tm_xxt placeholders behind', () => {
        root.walkRules((rule) => {
            expect(rule.selector.trim()).not.toBe('');
            expect(rule.selector).not.toMatch(/^\s*,|,\s*,|,\s*$/);
            expect(rule.selector).not.toContain('.tm_xxt');
        });
        expect(topLevelRules.filter((rule) => rule.selector.endsWith('::selection')).map((rule) => rule.selector)).toEqual(THEME_NAMES.map((name) => `.t_${name} ::selection`));
    });

    test('keeps theme variables out of colour scheme media queries except the system default fallback', () => {
        expect(colorSchemeMedia).toHaveLength(THEME_NAMES.length);

        const themed = [];
        for (const media of colorSchemeMedia) {
            media.walkRules((rule) => {
                expect(rule.selector).not.toMatch(/\.t_/);
                if (declarations(rule)['--primary']) {
                    themed.push([media.params, rule.selector, declarations(rule)['--primary']]);
                }
            });
        }

        expect(themed).toEqual([
            ['(prefers-color-scheme:light)', FALLBACK_SELECTOR, `#${String(THEME_NAMES.indexOf('lightBlue')).padStart(6, '0')}`],
            ['(prefers-color-scheme:dark)', FALLBACK_SELECTOR, `#${String(THEME_NAMES.indexOf('darkBlue')).padStart(6, '0')}`],
        ]);
    });

    test('keeps the body rule in each colour scheme media query', () => {
        for (const media of colorSchemeMedia) {
            expect(media.nodes.filter((node) => node.type === 'rule').map((rule) => rule.selector)[0]).toBe('body');
        }
    });

    test('leaves unrelated rules untouched', () => {
        expect(output).toContain(':root {--c-white:#FFFFFF;}');
        expect(output).toContain('._dsp_contents {display:contents;}');
    });

    test('is a no-op on already processed CSS', () => {
        expect(run(output)).toBe(output);
    });
});
