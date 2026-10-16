import { summarizeTruck, truckCategories, truckProducts } from '../../src/commerce/food-trucks';

describe('summarizeTruck', () => {
    it('is live when the truck takes orders, whatever its vehicle reports', () => {
        expect(summarizeTruck({ id: 'truck_1', online: true, vehicle: { online: false } }).live).toBe(true);
        expect(summarizeTruck({ id: 'truck_1', online: 1, vehicle: null }).live).toBe(true);
    });

    it('is not live when the truck is inactive, even with its vehicle online', () => {
        expect(summarizeTruck({ id: 'truck_1', online: false, vehicle: { online: true } }).live).toBe(false);
        expect(summarizeTruck({ id: 'truck_1', vehicle: { online: true } }).live).toBe(false);
    });
});

describe('nested menu categories', () => {
    // Lunch › Tacos › Vegetarian, and Drinks.
    const truck = {
        id: 'truck_1',
        catalogs: [
            {
                name: 'Menu',
                categories: [
                    { id: 'lunch', name: 'Lunch', parent: null, products: [{ id: 'p_wrap', name: 'Wrap' }] },
                    { id: 'tacos', name: 'Tacos', parent: 'lunch', products: [{ id: 'p_carnitas', name: 'Carnitas' }] },
                    { id: 'veggie', name: 'Vegetarian', parent: 'tacos', products: [{ id: 'p_mushroom', name: 'Mushroom' }] },
                    { id: 'drinks', name: 'Drinks', products: [{ id: 'p_cola', name: 'Cola' }] },
                ],
            },
        ],
    } as any;

    it('offers only a menu\'s top-level categories', () => {
        expect(truckCategories([truck]).map((category) => category.name)).toEqual(['Lunch', 'Drinks']);
    });

    it('puts each product under its top-level category, with its place below it', () => {
        expect(truckProducts(truck).map((item) => [item.product.name, item.topCategoryName, item.subPath, item.categoryName])).toEqual([
            ['Wrap', 'Lunch', '', 'Lunch'],
            ['Carnitas', 'Lunch', 'Tacos', 'Tacos'],
            ['Mushroom', 'Lunch', 'Tacos › Vegetarian', 'Vegetarian'],
            ['Cola', 'Drinks', '', 'Drinks'],
        ]);
    });
});
