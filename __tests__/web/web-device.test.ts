jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import { isDesktopBrowser } from '../../src/utils/web-device';

const browser = (userAgent: string, { coarse = false, maxTouchPoints = 0 } = {}) => ({
    navigator: { userAgent, maxTouchPoints },
    matchMedia: () => ({ matches: coarse }),
});

describe('isDesktopBrowser', () => {
    test('a desktop browser with a mouse', () => {
        expect(isDesktopBrowser(browser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'))).toBe(true);
        expect(isDesktopBrowser(browser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0'))).toBe(true);
    });

    test('phones and tablets are not', () => {
        expect(isDesktopBrowser(browser('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148'))).toBe(false);
        expect(isDesktopBrowser(browser('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130.0 Mobile Safari/537.36'))).toBe(false);
        // iPadOS asks for desktop sites but has touch.
        expect(isDesktopBrowser(browser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', { maxTouchPoints: 5 }))).toBe(false);
        expect(isDesktopBrowser(browser('Mozilla/5.0 (X11; Linux x86_64)', { coarse: true }))).toBe(false);
    });

    test('never on native', () => {
        expect(isDesktopBrowser(browser('Mozilla/5.0 (Macintosh)'), 'ios')).toBe(false);
        expect(isDesktopBrowser(undefined)).toBe(false);
    });
});
