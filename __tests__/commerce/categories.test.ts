import { ancestorAt, categoryIndex, categoryTree, descendantIds, groupByCategory } from '../../src/commerce/categories';

// Drinks › Coffee › Cold brew, Drinks › Tea, Food: flat, as the API lists them.
const flat = [
    { id: 'cold_brew', name: 'Cold brew', parent: 'coffee', icon_url: null },
    { id: 'drinks', name: 'Drinks', parent: null, icon_url: 'https://cdn.test/drinks.png' },
    { id: 'coffee', name: 'Coffee', parent: 'drinks' },
    { id: 'tea', name: 'Tea', parent: 'drinks' },
    { id: 'food', name: 'Food' },
];

describe('categoryTree', () => {
    it('nests categories under their parents with their level and path', () => {
        const tree = categoryTree(flat);
        const index = categoryIndex(tree);

        expect(tree.map((node) => node.id)).toEqual(['drinks', 'food']);
        expect(index.get('drinks')?.children.map((node) => node.id)).toEqual(['coffee', 'tea']);
        expect(index.get('cold_brew')).toMatchObject({ depth: 3, path: 'Drinks › Coffee › Cold brew', parentId: 'coffee' });
        expect(index.get('drinks')?.iconUrl).toBe('https://cdn.test/drinks.png');
        expect(descendantIds(index.get('drinks')!)).toEqual(['drinks', 'coffee', 'cold_brew', 'tea']);
    });

    it('reads SDK resources and object parents, and keeps categories without a known parent at the top', () => {
        const resource = (attributes: any) => ({ id: attributes.id, getAttribute: (key: string) => attributes[key] });
        const tree = categoryTree([resource({ id: 'a', name: 'A' }), resource({ id: 'b', name: 'B', parent: { id: 'a' } }), { id: 'c', name: 'C', parent: 'gone' }, null]);

        expect(tree.map((node) => node.id)).toEqual(['a', 'c']);
        expect(categoryIndex(tree).get('b')?.depth).toBe(2);
        expect(categoryTree(undefined as any)).toEqual([]);
    });

    it('does not lose categories that point at each other', () => {
        const tree = categoryTree([
            { id: 'a', name: 'A', parent: 'b' },
            { id: 'b', name: 'B', parent: 'a' },
        ]);

        expect(categoryIndex(tree).size).toBe(2);
    });
});

describe('ancestorAt', () => {
    it('finds the category at a level above another, or the category itself', () => {
        const index = categoryIndex(categoryTree(flat));

        expect(ancestorAt(index, 'cold_brew', 1)?.id).toBe('drinks');
        expect(ancestorAt(index, 'cold_brew', 2)?.id).toBe('coffee');
        expect(ancestorAt(index, 'tea', 2)?.id).toBe('tea');
        expect(ancestorAt(index, 'drinks', 2)?.id).toBe('drinks');
        expect(ancestorAt(index, 'missing', 1)).toBeNull();
        expect(ancestorAt(index, null, 1)).toBeNull();
    });
});

describe('groupByCategory', () => {
    it('groups a top category\'s products under its subcategories, in tree order', () => {
        const drinks = categoryIndex(categoryTree(flat)).get('drinks')!;
        const products = [
            { name: 'Nitro', category: 'cold_brew' },
            { name: 'Water', category: 'drinks' },
            { name: 'Chai', category: 'tea' },
            { name: 'Flat white', category: 'coffee' },
            { name: 'Mystery', category: 'elsewhere' },
            { name: 'Loose', category: null },
        ];

        const groups = groupByCategory(drinks, products, (product) => product.category);

        expect(groups.map((group) => [group.name, group.level, group.items.map((item) => item.name)])).toEqual([
            ['Drinks', 0, ['Water', 'Mystery', 'Loose']],
            ['Coffee', 1, ['Flat white']],
            ['Cold brew', 2, ['Nitro']],
            ['Tea', 1, ['Chai']],
        ]);
        expect(groups[2].path).toBe('Drinks › Coffee › Cold brew');
    });

    it('leaves out headings with nothing under them', () => {
        const drinks = categoryIndex(categoryTree(flat)).get('drinks')!;

        expect(groupByCategory(drinks, [{ category: 'tea' }], (item) => item.category).map((group) => group.id)).toEqual(['tea']);
    });
});
