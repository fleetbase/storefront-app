import { Dimensions } from 'react-native';

/**
 * On wide screens the web app is a phone-width column in the middle of the page
 * (public/global.css). Screens size themselves from the window's width, so on those screens
 * Dimensions and useWindowDimensions report the column's width instead of the window's.
 * Keep both numbers in step with global.css.
 */
export const WEB_COLUMN_WIDTH = 480;
export const WEB_COLUMN_MIN_WINDOW = 600;

let installed = false;

type Size = { width: number; height: number; scale: number; fontScale: number };

export function columnSize<T extends Size>(size: T): T {
    if (!size || size.width < WEB_COLUMN_MIN_WINDOW) return size;
    return { ...size, width: WEB_COLUMN_WIDTH };
}

/** The column's width for a full-window layer (a modal) on a wide screen, else undefined. */
export function columnMaxWidth(): number | undefined {
    if (typeof window === 'undefined' || typeof window.innerWidth !== 'number' || !installed) return undefined;
    return window.innerWidth >= WEB_COLUMN_MIN_WINDOW ? WEB_COLUMN_WIDTH : undefined;
}

/** Makes Dimensions report the column. Web only; call once before the app renders. */
export function installWebColumn(dimensions: any = Dimensions) {
    if (installed) return;
    installed = true;

    // Same input, same object, so a re-read doesn't re-render useWindowDimensions callers.
    let lastInput: Size | null = null;
    let lastOutput: Size | null = null;
    const clampWindow = (size: Size) => {
        if (size !== lastInput) {
            lastInput = size;
            lastOutput = columnSize(size);
        }
        return lastOutput;
    };

    const get = dimensions.get.bind(dimensions);
    dimensions.get = (dimension: string) => (dimension === 'window' ? clampWindow(get(dimension)) : get(dimension));

    const wrapped = new Map<Function, Function>();
    const addEventListener = dimensions.addEventListener.bind(dimensions);
    const removeEventListener = dimensions.removeEventListener?.bind(dimensions);
    dimensions.addEventListener = (type: string, handler: Function) => {
        const listener = (event: any) => handler(event?.window ? { ...event, window: clampWindow(event.window) } : event);
        wrapped.set(handler, listener);
        const subscription = addEventListener(type, listener);
        return {
            remove: () => {
                wrapped.delete(handler);
                subscription?.remove?.();
            },
        };
    };
    if (removeEventListener) {
        dimensions.removeEventListener = (type: string, handler: Function) => {
            removeEventListener(type, wrapped.get(handler) ?? handler);
            wrapped.delete(handler);
        };
    }
}
