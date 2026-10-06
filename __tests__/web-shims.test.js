import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

class MemoryStorage {
    constructor() {
        this.values = new Map();
    }
    getItem(key) {
        return this.values.has(key) ? this.values.get(key) : null;
    }
    setItem(key, value) {
        this.values.set(key, String(value));
    }
    removeItem(key) {
        this.values.delete(key);
    }
    clear() {
        this.values.clear();
    }
}

global.IS_REACT_ACT_ENVIRONMENT = true;

const shim = require('../web/react-native-mmkv-storage');
const deviceInfo = require('../web/react-native-device-info.web');

beforeEach(() => {
    global.localStorage = new MemoryStorage();
});

afterEach(() => {
    delete global.localStorage;
});

describe('web MMKV storage shim', () => {
    test('stores strings raw and other values as JSON', () => {
        expect(shim.serializeStoredValue('lightBlue')).toBe('lightBlue');
        expect(shim.serializeStoredValue({ a: 1 })).toBe('{"a":1}');
        expect(shim.deserializeStoredValue('{"a":1}')).toEqual({ a: 1 });
        expect(shim.deserializeStoredValue('lightBlue')).toBe('lightBlue');
        expect(shim.deserializeStoredValue(null)).toBeUndefined();
    });

    test('reads strings written by the previous JSON-encoding shim', () => {
        expect(shim.deserializeStoredValue('"lightBlue"')).toBe('lightBlue');
    });

    test('exposes clearStore like native MMKV', () => {
        const storage = new shim.MMKVLoader().initialize();
        storage.setString('a', '1');
        storage.clearStore();
        expect(storage.getString('a')).toBeNull();
    });

    function renderHooks(key, defaults) {
        const storage = new shim.MMKVLoader().initialize();
        const results = defaults.map(() => ({ current: null }));
        let renders = 0;
        const Probe = ({ index }) => {
            renders += 1;
            // Inline literal defaults are a new object each render; this must not loop.
            results[index].current = shim.useMMKVStorage(key, storage, defaults[index]());
            return null;
        };
        let renderer;
        act(() => {
            renderer = TestRenderer.create(
                <>
                    {defaults.map((_, index) => (
                        <Probe key={index} index={index} />
                    ))}
                </>
            );
        });
        return { storage, results, getRenders: () => renders, renderer };
    }

    test('does not re-render repeatedly when callers pass inline default literals', () => {
        const { getRenders, results } = renderHooks('owner', [() => ({})]);
        expect(results[0].current[0]).toEqual({});
        expect(getRenders()).toBeLessThanOrEqual(3);
    });

    test('keeps hooks that share a key in sync and persists raw strings', () => {
        const { storage, results } = renderHooks('app_theme', [() => 'lightBlue', () => 'lightBlue']);

        act(() => {
            results[0].current[1]('darkBlue');
        });

        expect(results[0].current[0]).toBe('darkBlue');
        expect(results[1].current[0]).toBe('darkBlue');
        expect(storage.getString('app_theme')).toBe('darkBlue');
    });

    test('supports functional updates and removal', () => {
        const { storage, results } = renderHooks('items', [() => []]);

        act(() => {
            results[0].current[1]((current) => [...current, 1]);
        });
        expect(results[0].current[0]).toEqual([1]);
        expect(storage.getString('items')).toBe('[1]');

        act(() => {
            results[0].current[1](null);
        });
        expect(storage.getString('items')).toBeNull();
    });
});

describe('web device info shim', () => {
    test('returns the same unique id across calls', async () => {
        const first = await deviceInfo.getUniqueId();
        const second = await deviceInfo.getUniqueId();
        expect(first).toBeTruthy();
        expect(second).toBe(first);
    });

    test('reuses a previously stored id', async () => {
        global.localStorage.setItem('unique_device_id', 'existing-id');
        await expect(deviceInfo.getUniqueId()).resolves.toBe('existing-id');
    });
});
