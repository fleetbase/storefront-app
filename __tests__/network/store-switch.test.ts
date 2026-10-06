import { hasStoreSwitchHost, registerStoreSwitchHost, requestStoreSwitch } from '../../src/network/store-switch';

test('store switch requests go to the mounted host and resolve with its answer', async () => {
    expect(hasStoreSwitchHost()).toBe(false);
    expect(requestStoreSwitch({ kind: 'currency', cartCurrency: 'SGD', itemCurrency: 'MYR', toStoreId: null })).toBeNull();

    const seen: any[] = [];
    const unregister = registerStoreSwitchHost((pending) => {
        seen.push(pending.request);
        pending.resolve(pending.request.kind === 'replace');
    });
    const other = registerStoreSwitchHost(() => {});
    // The most recent host wins; unregistering an old host leaves the current one.
    unregister();
    expect(hasStoreSwitchHost()).toBe(true);
    other();
    expect(hasStoreSwitchHost()).toBe(false);

    const stop = registerStoreSwitchHost((pending) => {
        seen.push(pending.request);
        pending.resolve(pending.request.kind === 'replace');
    });
    await expect(requestStoreSwitch({ kind: 'replace', fromStoreId: 'a', toStoreId: 'b', itemCount: 2, total: 'S$94.00' })).resolves.toBe(true);
    await expect(requestStoreSwitch({ kind: 'currency', cartCurrency: 'SGD', itemCurrency: 'MYR', toStoreId: 'b' })).resolves.toBe(false);
    stop();
    expect(seen.map((request) => request.kind)).toEqual(['replace', 'currency']);
});
