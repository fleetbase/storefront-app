import { Platform } from 'react-native';

type BrowserLike = { navigator?: { userAgent?: string; maxTouchPoints?: number }; matchMedia?: (query: string) => { matches: boolean } };

/**
 * Whether the app runs in a desktop browser: web, with a mouse and no phone or tablet user
 * agent. Phone-only links (a bank's app) are hidden there.
 */
export function isDesktopBrowser(browser: BrowserLike | undefined = typeof window !== 'undefined' ? (window as any) : undefined, os: string = Platform.OS): boolean {
    if (os !== 'web' || !browser) return false;
    const agent = browser.navigator?.userAgent ?? '';
    if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(agent)) return false;
    // iPadOS reports a desktop Safari user agent, but has touch.
    if (/Macintosh/.test(agent) && (browser.navigator?.maxTouchPoints ?? 0) > 1) return false;
    return !(browser.matchMedia?.('(pointer: coarse)').matches ?? false);
}
