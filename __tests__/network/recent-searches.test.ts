import { addRecentSearch, MAX_RECENT_SEARCHES, removeRecentSearch } from '../../src/network/recent-searches';

test('recent searches are trimmed, unique, newest first and capped', () => {
    expect(addRecentSearch(['repair', 'sunflowers'], '  Sunflowers ')).toEqual(['Sunflowers', 'repair']);
    expect(addRecentSearch(null, 'a')).toEqual([]);
    expect(addRecentSearch(['x', 3], 'usb-c')).toEqual(['usb-c', 'x']);
    const many = Array.from({ length: 12 }, (_, index) => `term ${index}`);
    expect(addRecentSearch(many, 'new term')).toHaveLength(MAX_RECENT_SEARCHES);
    expect(removeRecentSearch(['a', 'b'], 'a')).toEqual(['b']);
    expect(removeRecentSearch(undefined, 'a')).toEqual([]);
});
