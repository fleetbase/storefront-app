import { activeFilterCount, buildDirectoryQuery, DEFAULT_DIRECTORY_FILTERS } from '../../src/network/directory';

describe('store directory', () => {
    test('counts active filters but not the sort', () => {
        expect(activeFilterCount(DEFAULT_DIRECTORY_FILTERS)).toBe(0);
        expect(activeFilterCount({ sort: 'newest', tags: ['eco', 'weekends'], openNow: true, maximumDistance: 3000 })).toBe(4);
    });

    test('builds the default query', () => {
        expect(buildDirectoryQuery(DEFAULT_DIRECTORY_FILTERS)).toEqual({ limit: 20, offset: 0, sort: 'nearest', with_locations: true });
    });

    test('adds category, tags, open now, location and distance', () => {
        expect(
            buildDirectoryQuery({ sort: 'highest_rated', tags: ['services'], openNow: true, maximumDistance: 3000 }, { categoryId: 'category_1', coordinates: '1.3,103.8', offset: 40, limit: 10 })
        ).toEqual({
            limit: 10,
            offset: 40,
            sort: 'highest_rated',
            with_locations: true,
            category: 'category_1',
            tagged: ['services'],
            online: true,
            location: '1.3,103.8',
            maximum_distance: 3000,
        });
    });

    test('lists uncategorized stores and ignores distance without a location', () => {
        const query = buildDirectoryQuery({ ...DEFAULT_DIRECTORY_FILTERS, maximumDistance: 1000 }, { categoryId: 'uncategorized' });
        expect(query.without_category).toBe(true);
        expect(query.category).toBeUndefined();
        expect(query.maximum_distance).toBeUndefined();
        expect(query.location).toBeUndefined();
    });
});
