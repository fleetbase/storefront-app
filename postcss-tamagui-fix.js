// postcss-tamagui-fix.js

// An ordered list of the theme names you expect, in the exact order
// they appear in your final .css. This must match the key order of the
// `themes` object in tamagui.config.ts (THEME_NAMES in src/branding/build-themes.ts;
// a test keeps the two in sync).
const THEME_NAMES = ['lightBlue', 'lightRed', 'lightGreen', 'lightIndigo', 'lightOrange', 'darkBlue', 'darkRed', 'darkGreen', 'darkIndigo', 'darkOrange', 'lightTruevegan', 'darkTruevegan'];

// The themes used when the root has no theme class yet (before the app mounts).
// They match the default `blue` preset in src/branding/defaults.ts.
const SYSTEM_DEFAULT_THEMES = {
    light: THEME_NAMES.find((name) => name.startsWith('light')),
    dark: THEME_NAMES.find((name) => name.startsWith('dark')),
};

// Matches the root only while it carries no `t_light*` / `t_dark*` theme class.
// `:where()` keeps it at zero specificity so it can never beat a `.t_<theme>` rule.
const SYSTEM_DEFAULT_SELECTOR = ':where(:root:not([class*="t_light"]):not([class*="t_dark"]))';

// A selector list with an empty entry, e.g. `, .tm_xxt` or `.a, , .b`.
const EMPTY_SELECTOR_ENTRY = /(^|,)\s*(,|$)/;

const COLOR_SCHEME_MEDIA = /\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)/;

// Tamagui's web output for each theme (with our generated theme names) looks like:
//
//     , .tm_xxt { --primary: ...; }
//     @media (prefers-color-scheme:light) {
//         body { background: var(--background); color: var(--color) }
//          { --primary: ...; }
//     }
//
// The leading empty selector makes the first rule invalid, so browsers drop it,
// and the empty rule in the media query only matches the OS colour scheme.
// This plugin walks the top-level nodes in order and:
//
// 1) Drops empty entries from selector lists and renames the nth `.tm_xxt`
//    to `.t_<THEME_NAMES[n]>`, giving an unconditional rule for every theme,
//    so the theme follows the root class whatever the OS colour scheme is.
//
// 2) Removes the duplicate empty rule from each colour scheme media query,
//    except for the first light and first dark theme, whose copy becomes a
//    fallback for a root without a theme class.
//
// The pairing relies on the nth `.tm_xxt` rule and the nth colour scheme media
// query belonging to THEME_NAMES[n]. Running the plugin twice is a no-op.
module.exports = function postcssTamaguiFix() {
    return {
        postcssPlugin: 'postcss-tamagui-fix',

        OnceExit(root) {
            let tmIndex = 0; // for the .tm_xxt rules
            let mediaIndex = 0; // for the empty rules in colour scheme media queries

            root.each((node) => {
                if (node.type === 'rule') {
                    // `rule.selectors` already omits empty entries, so writing it back drops them.
                    if (EMPTY_SELECTOR_ENTRY.test(node.selector) && node.selectors.length > 0) {
                        node.selectors = node.selectors;
                    }

                    if (node.selector.includes('.tm_xxt') && tmIndex < THEME_NAMES.length) {
                        node.selector = node.selector.replace(/\.tm_xxt/g, `.t_${THEME_NAMES[tmIndex]}`);
                        tmIndex += 1;
                    }
                    return;
                }

                if (node.type !== 'atrule' || node.name !== 'media') {
                    return;
                }

                const scheme = node.params.match(COLOR_SCHEME_MEDIA)?.[1];
                if (!scheme) {
                    return;
                }

                node.each((child) => {
                    if (child.type !== 'rule' || child.selector.trim()) {
                        return;
                    }

                    const themeName = THEME_NAMES[mediaIndex];
                    mediaIndex += 1;

                    if (themeName && themeName === SYSTEM_DEFAULT_THEMES[scheme]) {
                        child.selector = SYSTEM_DEFAULT_SELECTOR;
                    } else {
                        child.remove();
                    }
                });
            });
        },
    };
};

module.exports.postcss = true;
module.exports.THEME_NAMES = THEME_NAMES;
