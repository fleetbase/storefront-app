jest.mock('react-native', () => ({ Dimensions: {} }));

import { WEB_COLUMN_WIDTH, columnSize, installWebColumn } from '../../src/utils/web-column';

const size = (width: number) => ({ width, height: 900, scale: 2, fontScale: 1 });

function fakeDimensions(initial: number) {
    const listeners = new Set<Function>();
    let window = size(initial);
    return {
        get: (dimension: string) => (dimension === 'window' ? window : size(9999)),
        addEventListener: (_type: string, handler: Function) => {
            listeners.add(handler);
            return { remove: () => listeners.delete(handler) };
        },
        removeEventListener: (_type: string, handler: Function) => listeners.delete(handler),
        resize(width: number) {
            window = size(width);
            listeners.forEach((handler) => handler({ window, screen: size(9999) }));
        },
        listeners,
    };
}

describe('columnSize', () => {
    test('a phone-sized window is left alone', () => {
        const phone = size(390);
        expect(columnSize(phone)).toBe(phone);
    });

    test('a wide window reports the column', () => {
        expect(columnSize(size(1440))).toEqual({ ...size(1440), width: WEB_COLUMN_WIDTH });
    });
});

describe('installWebColumn', () => {
    test('clamps get and change events, and removes wrapped listeners', () => {
        const dimensions = fakeDimensions(1440);
        installWebColumn(dimensions);
        expect(dimensions.get('window').width).toBe(WEB_COLUMN_WIDTH);
        // The same size reads back as the same object, so hooks don't re-render.
        expect(dimensions.get('window')).toBe(dimensions.get('window'));
        expect(dimensions.get('screen').width).toBe(9999);

        const handler = jest.fn();
        dimensions.addEventListener('change', handler);
        dimensions.resize(500);
        expect(handler).toHaveBeenLastCalledWith(expect.objectContaining({ window: expect.objectContaining({ width: 500 }) }));
        dimensions.resize(1200);
        expect(handler).toHaveBeenLastCalledWith(expect.objectContaining({ window: expect.objectContaining({ width: WEB_COLUMN_WIDTH }) }));

        dimensions.removeEventListener('change', handler);
        expect(dimensions.listeners.size).toBe(0);
    });
});
