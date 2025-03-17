// postcss-tamagui-fix.js

// An ordered list of the theme names you expect, in the exact order
// they appear in your final .css:
const THEME_NAMES = ['lightBlue', 'lightRed', 'lightGreen', 'lightIndigo', 'lightOrange', 'darkBlue', 'darkRed', 'darkGreen', 'darkIndigo', 'darkOrange'];

// This plugin does two tasks in two passes:
//
// 1) In 'AtRule': for each empty rule inside a color-scheme media query, rename it
//    from '{}' to something like `.t_lightBlue :root { ... }`.
//
// 2) In 'OnceExit': for each `.tm_xxt` rule, rename it to `.t_lightBlue`, etc.
//
// We rely on a stable "pairing" between the nth empty rule and the nth .tm_xxt rule.
// If your CSS changes ordering, you'll need to adapt.
module.exports = function postcssTamaguiFix() {
    let emptyIndex = 0; // for the empty rules
    let tmIndex = 0; // for the .tm_xxt blocks

    return {
        postcssPlugin: 'postcss-tamagui-fix',

        // 1) Fix empty selectors in color scheme media queries
        //    and rename them to `.t_someTheme :root`
        AtRule(atRule) {
            if (atRule.name === 'media' && (atRule.params.includes('(prefers-color-scheme:light)') || atRule.params.includes('(prefers-color-scheme:dark)'))) {
                atRule.walkRules((rule) => {
                    // If no selector => we guess it belongs to the next theme in THEME_NAMES
                    if (!rule.selector || !rule.selector.trim()) {
                        if (emptyIndex < THEME_NAMES.length) {
                            const themeName = THEME_NAMES[emptyIndex];
                            rule.selector = `.t_${themeName}`;
                            emptyIndex += 1;
                        } else {
                            // If we run out of theme names, fallback to :root or do nothing
                            rule.selector = ':root';
                        }
                    }
                });
            }
        },

        // 2) Rename each `.tm_xxt` to the next theme name in the array
        OnceExit(root) {
            root.walkRules((rule) => {
                if (rule.selector && rule.selector.includes('.tm_xxt')) {
                    if (tmIndex < THEME_NAMES.length) {
                        const themeName = THEME_NAMES[tmIndex];
                        rule.selector = rule.selector.replace(/\.tm_xxt/g, `.t_${themeName}`);
                        tmIndex += 1;
                    } else {
                        // no more theme names left – do nothing or fallback
                    }
                }
            });
        },
    };
};

module.exports.postcss = true;
