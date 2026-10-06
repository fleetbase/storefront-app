import { canChoose, cartOptions, describeSelection, missingGroups, optionGroups, toggleOption, unitPrice } from '../../src/ui/product-options';

const variants = [
    { id: 'size', name: 'Size', is_required: true, options: [{ id: 'classic', name: 'Classic', additional_cost: 0 }, { id: 'deluxe', name: 'Deluxe', additional_cost: '4600' }] },
    { id: 'wrap', name: 'Wrapping', is_required: false, is_multiselect: true, max: 2, options: [{ id: 'kraft', name: 'Kraft' }, { id: 'linen', name: 'Linen', additional_cost: 600 }, { id: 'vase', name: 'Vase', additional_cost: 1200 }] },
    { id: 'empty', name: 'Nothing', options: [] },
    { name: 'No id', options: [{ id: 'x' }] },
];
const addons = [
    { id: 'extras', name: 'Extras', max_selectable: 1, addons: [{ id: 'card', name: 'Card', price: 400 }, { id: 'choc', name: 'Chocolates', price: 2000, sale_price: 1800, is_on_sale: true }, { name: 'no id' }] },
    { id: 'gift', name: 'Gift wrap', is_required: true, addons: [{ id: 'bow', name: 'Bow', price: '150' }] },
];

describe('product options', () => {
    const groups = optionGroups(variants, addons);

    test('builds variant and add-on groups and drops empty or unidentified ones', () => {
        expect(groups.map((group) => [group.id, group.kind, group.required, group.multiple, group.max, group.options.length])).toEqual([
            ['size', 'variant', true, false, 1, 2],
            ['wrap', 'variant', false, true, 2, 3],
            ['extras', 'addon', false, true, 1, 2],
            ['gift', 'addon', true, true, null, 1],
        ]);
        expect(groups[2].options[1].price).toBe(1800);
        expect(optionGroups(null, undefined)).toEqual([]);
    });

    test('single choices swap, required single choices cannot be cleared, multi choices respect limits', () => {
        let selection = toggleOption(groups, {}, 'size', 'classic');
        selection = toggleOption(groups, selection, 'size', 'deluxe');
        expect(selection.size).toEqual(['deluxe']);
        expect(toggleOption(groups, selection, 'size', 'deluxe')).toBe(selection);

        selection = toggleOption(groups, selection, 'wrap', 'kraft');
        selection = toggleOption(groups, selection, 'wrap', 'linen');
        expect(toggleOption(groups, selection, 'wrap', 'vase')).toBe(selection);
        expect(canChoose(groups[1], selection, 'vase')).toBe(false);
        expect(canChoose(groups[1], selection, 'kraft')).toBe(true);
        selection = toggleOption(groups, selection, 'wrap', 'kraft');
        expect(selection.wrap).toEqual(['linen']);
        expect(canChoose(groups[3], selection, 'bow')).toBe(true);
        expect(canChoose(groups[0], selection, 'classic')).toBe(true);

        expect(toggleOption(groups, selection, 'missing', 'x')).toBe(selection);
        expect(toggleOption(groups, selection, 'size', 'missing')).toBe(selection);
        const optionalSingle = optionGroups([{ id: 'o', options: [{ id: 'a' }] }], []);
        expect(toggleOption(optionalSingle, { o: ['a'] }, 'o', 'a')).toEqual({ o: [] });
    });

    test('reports missing required groups, unit price, cart payload and a description', () => {
        expect(missingGroups(groups, {}).map((group) => group.id)).toEqual(['size', 'gift']);
        const selection = { size: ['deluxe'], wrap: ['vase'], extras: ['choc'], gift: ['bow'] };
        expect(missingGroups(groups, selection)).toEqual([]);
        expect(unitPrice(6800, groups, selection)).toBe(6800 + 4600 + 1200 + 1800 + 150);
        expect(unitPrice(100, groups, { extras: ['gone'] })).toBe(100);
        expect(cartOptions(groups, selection)).toEqual({
            variants: [variants[0].options[1], variants[1].options[2]],
            addons: [addons[0].addons[1], addons[1].addons[0]],
        });
        expect(cartOptions(groups, { extras: ['gone'] })).toEqual({ variants: [], addons: [] });
        expect(describeSelection(groups, selection)).toBe('Deluxe · Vase · Chocolates · Bow');
    });
});

describe('selectionFromCartItem', () => {
    const { optionGroups, selectionFromCartItem } = require('../../src/ui/product-options');
    const groups = optionGroups(
        [{ id: 'size', name: 'Size', is_multiselect: false, options: [{ id: 's', name: 'Small' }, { id: 'l', name: 'Large' }] }],
        [{ id: 'extras', name: 'Extras', addons: [{ id: 'a1', name: 'Fridge' }, { id: 'a2', name: 'Oven' }] }]
    );

    test('restores the options a cart line was added with', () => {
        expect(selectionFromCartItem(groups, { variants: [{ id: 'l' }, { id: 's' }], addons: [{ id: 'a2' }, 'a1', { id: 'gone' }] })).toEqual({ size: ['s'], extras: ['a1', 'a2'] });
        expect(selectionFromCartItem(groups, null)).toEqual({});
    });
});
