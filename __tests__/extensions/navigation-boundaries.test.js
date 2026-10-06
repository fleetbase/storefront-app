const fs = require('fs');
const path = require('path');

// Mirrors the no-restricted-imports rule in .eslintrc.js so the boundary is enforced in CI
// even though the navigation directory has unrelated pre-existing lint errors.
const NAVIGATION_DIR = path.join(__dirname, '../../src/navigation');
const ESLINT_CONFIG = require('../../.eslintrc.js');
const restricted = ESLINT_CONFIG.overrides.find((override) => override.files.some((pattern) => pattern.startsWith('src/navigation')));
const [, { patterns }] = restricted.rules['no-restricted-imports'];
const modules = patterns[0].group.filter((pattern) => !pattern.endsWith('/*')).map((pattern) => pattern.split('/').pop());

function listFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        return entry.isDirectory() ? listFiles(fullPath) : /\.(t|j)sx?$/.test(entry.name) ? [fullPath] : [];
    });
}

test('navigators reference overridable screens through screenSlot', () => {
    expect(modules).toContain('StoreHomeScreen');
    const violations = [];
    for (const file of listFiles(NAVIGATION_DIR)) {
        const source = fs.readFileSync(file, 'utf8');
        const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
        imports.forEach((specifier) => {
            const name = specifier.split('/').pop();
            if (/\/screens\/network\//.test(specifier) || (/\/screens\//.test(specifier) && modules.includes(name))) {
                violations.push(`${path.relative(NAVIGATION_DIR, file)} imports ${specifier}`);
            }
        });
    }
    expect(violations).toEqual([]);
});
