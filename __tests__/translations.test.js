const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../translations');
const flatten = (object, prefix = '') =>
    Object.entries(object).flatMap(([key, value]) => {
        const name = prefix ? `${prefix}.${key}` : key;
        return value && typeof value === 'object' ? flatten(value, name) : [name];
    });

const locales = fs.readdirSync(dir).filter((file) => file.endsWith('.json'));
const english = new Set(flatten(require(path.join(dir, 'en.json'))));

test.each(locales.filter((file) => file !== 'en.json'))('%s has the same keys as en.json', (file) => {
    const keys = new Set(flatten(require(path.join(dir, file))));
    expect([...english].filter((key) => !keys.has(key))).toEqual([]);
    expect([...keys].filter((key) => !english.has(key))).toEqual([]);
});

test('every translation file is registered in localize.js', () => {
    const source = fs.readFileSync(path.join(__dirname, '../src/utils/localize.js'), 'utf8');
    for (const file of locales) {
        expect(source).toContain(`translations/${file}`);
    }
});
