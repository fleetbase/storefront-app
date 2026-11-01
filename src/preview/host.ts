/**
 * Hosted preview mode, for web builds made to run inside another site's iframe
 * (for example a brand editor). It is off unless the bundle was built with
 * STOREFRONT_PREVIEW_ORIGIN: the origins, comma separated, allowed to drive the preview.
 *
 * - Before the bundle loads, the host page sets `window.__STOREFRONT_PREVIEW__`
 *   to `{ env, branding }`: configuration keys (which store to show) and the
 *   branding to start from. Everything read at startup uses them.
 * - While it runs, the host posts `{ type: 'storefront:branding', branding }`
 *   messages and the app re-themes without reloading. Settings read at startup
 *   (navigation, card styles, typography) need the host to reload the frame.
 * - When it can take messages, the app posts `{ type: 'storefront:preview-ready' }`
 *   to the host.
 *
 * A published web store runs the same bundle with `HOSTED_MODE=live` in `env`. It is a real
 * store, not a preview: the customer picks their location and address as usual, and the
 * host can't re-theme it with messages (there is no host frame).
 *
 * Native builds and web builds without the flag behave exactly as before.
 */
declare const __PREVIEW_ORIGIN__: string | undefined;

export type HostedPreview = { env?: Record<string, string>; branding?: unknown };

type PreviewWindow = {
    __STOREFRONT_PREVIEW__?: unknown;
    parent?: { postMessage: (message: unknown, targetOrigin: string) => void } | null;
    addEventListener: (type: 'message', listener: (event: { origin: string; data: any }) => void) => void;
    removeEventListener: (type: 'message', listener: (event: { origin: string; data: any }) => void) => void;
};

export const BRANDING_MESSAGE = 'storefront:branding';
export const READY_MESSAGE = 'storefront:preview-ready';

export function parseOrigins(value: string | undefined): string[] {
    return (value ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}

/** Keeps only string configuration values, so a malformed host page can't inject anything else. */
function readInitial(raw: unknown): HostedPreview | null {
    if (!raw || typeof raw !== 'object') return null;
    const { env, branding } = raw as { env?: unknown; branding?: unknown };
    const safeEnv =
        env && typeof env === 'object' ? Object.fromEntries(Object.entries(env as Record<string, unknown>).filter(([, value]) => typeof value === 'string')) as Record<string, string> : undefined;
    return { env: safeEnv, branding };
}

export function createHostedPreview({ origins, target }: { origins: string[]; target?: PreviewWindow }) {
    const hosted = origins.length > 0 && !!target;
    const initial = hosted ? readInitial(target!.__STOREFRONT_PREVIEW__) : null;
    const live = hosted && initial?.env?.HOSTED_MODE === 'live';
    // The read-only brand preview; a published store (live) is hosted but not a preview.
    const enabled = hosted && !live;

    return {
        enabled,
        live,
        initial,
        /** Calls `onBranding` for each branding message from an allowed origin. Returns an unsubscribe function. */
        subscribe(onBranding: (branding: unknown) => void): () => void {
            if (!enabled) return () => {};
            const listener = (event: { origin: string; data: any }) => {
                if (!origins.includes(event.origin)) return;
                if (event.data?.type === BRANDING_MESSAGE) onBranding(event.data.branding);
            };
            target!.addEventListener('message', listener);
            for (const origin of origins) target!.parent?.postMessage({ type: READY_MESSAGE }, origin);
            return () => target!.removeEventListener('message', listener);
        },
    };
}

const hosted = createHostedPreview({
    origins: parseOrigins(typeof __PREVIEW_ORIGIN__ === 'string' ? __PREVIEW_ORIGIN__ : undefined),
    target: typeof window !== 'undefined' ? (window as unknown as PreviewWindow) : undefined,
});

/** The read-only brand preview: starts at the store, re-themes from host messages. */
export const isHostedPreview = hosted.enabled;
/** A published web store (`HOSTED_MODE=live`): the host's env and branding, the normal store flow. */
export const isLivePublished = hosted.live;
export const initialHostedPreview = hosted.initial;
export const subscribeToHostBranding = hosted.subscribe;
