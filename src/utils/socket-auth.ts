/**
 * Socket authentication for the realtime (SocketCluster) connection.
 *
 * The socket server only lets a client subscribe to the channels its token
 * covers. Logged-in customers mint a short-lived token from
 * `POST storefront/v1/customers/socket-token` (store key as Bearer plus the
 * `Customer-Token` header, the same way every other customer request is
 * authenticated). Guests paying through QPay get a checkout-scoped token in the
 * `socket_token` field of the checkout initialize response.
 *
 * Tokens are kept in memory only: never persisted to device/browser storage and
 * never put in the socket URL. They reach the server through a custom
 * `authEngine` (handshake) and `socket.authenticate()` (refresh / login).
 *
 * Servers without socket auth answer the mint route with 404; the app then
 * connects anonymously, exactly as it did before.
 */
import { adapter as storefrontAdapter } from '../hooks/use-storefront';
import { getString } from '../hooks/use-storage';

export interface SocketTokenResponse {
    token: string;
    expires_in?: number;
    expires_at?: string;
}

type TokenSource = 'customer' | 'checkout';

/** Refresh / reload this many ms before the token expires. */
const EXPIRY_MARGIN_MS = 60 * 1000;
/** Never schedule a refresh sooner than this. */
const MIN_REFRESH_DELAY_MS = 5 * 1000;
/** Re-subscribe attempts per channel before giving up (reset on success, login, logout). */
const MAX_RESUBSCRIBE_ATTEMPTS = 3;
/** Consecutive failed `socket.authenticate()` calls before giving up until the next login/refresh. */
const MAX_AUTH_FAILURES = 3;
/** Collapse bursts of kickOut/subscribeFail events (e.g. after a principal change) into one recovery. */
const RECOVER_DEBOUNCE_MS = 250;

export function getCustomerToken(customer: any): string | null {
    let token = null;
    if (customer && typeof customer.getAttribute === 'function') {
        token = customer.getAttribute('token');
    } else if (customer && typeof customer === 'object') {
        token = customer.token;
    }
    if (!token) {
        try {
            token = getString('_customer_token');
        } catch (_) {
            token = null;
        }
    }
    return typeof token === 'string' && token.length > 0 ? token : null;
}

export function normalizeSocketToken(value: any): SocketTokenResponse | null {
    if (!value) return null;
    if (typeof value === 'string') return { token: value };
    if (typeof value === 'object' && typeof value.token === 'string' && value.token.length > 0) {
        return { token: value.token, expires_in: value.expires_in, expires_at: value.expires_at };
    }
    return null;
}

function computeExpiresAt(response: SocketTokenResponse): number {
    const expiresIn = Number(response.expires_in);
    if (Number.isFinite(expiresIn) && expiresIn > 0) {
        return Date.now() + expiresIn * 1000;
    }
    if (response.expires_at) {
        const parsed = Date.parse(response.expires_at);
        if (Number.isFinite(parsed)) return parsed;
    }
    // Fall back to the JWT's own exp claim.
    try {
        const payload = response.token.split('.')[1];
        const json = JSON.parse(base64UrlDecode(payload));
        if (json && Number.isFinite(json.exp)) return json.exp * 1000;
    } catch (_) {
        // ignore
    }
    return 0;
}

function base64UrlDecode(input: string): string {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    if (typeof atob === 'function') return atob(padded);
    // eslint-disable-next-line no-undef
    return Buffer.from(padded, 'base64').toString('binary');
}

/**
 * Mint a socket token for the logged-in customer.
 * Returns null when there is no customer, the server does not support socket
 * auth (404 => `unsupported: true`) or the request fails.
 */
export async function requestCustomerSocketToken(customerToken: string): Promise<{ response: SocketTokenResponse | null; unsupported: boolean }> {
    const adapter: any = storefrontAdapter;
    const host = String(adapter?.host ?? '').replace(/\/+$/, '');
    const namespace = String(adapter?.namespace ?? '').replace(/^\/+|\/+$/g, '');
    const url = [host, namespace, 'customers/socket-token'].filter(Boolean).join('/');

    let res;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: {
                ...(adapter?.headers ?? {}),
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Customer-Token': customerToken,
            },
            body: '{}',
        });
    } catch (err) {
        console.warn('[SocketAuth] Unable to reach the socket token endpoint:', err?.message ?? err);
        return { response: null, unsupported: false };
    }

    if (res.status === 404) {
        return { response: null, unsupported: true };
    }
    if (!res.ok) {
        console.warn(`[SocketAuth] Socket token request failed with HTTP ${res.status}; connecting anonymously.`);
        return { response: null, unsupported: false };
    }

    try {
        return { response: normalizeSocketToken(await res.json()), unsupported: false };
    } catch (_) {
        return { response: null, unsupported: false };
    }
}

interface SocketAuthManagerOptions {
    /** Returns the logged-in customer's token, or null for guests. */
    getCustomerToken: () => string | null;
    /** Injectable for tests. */
    requestToken?: (customerToken: string) => Promise<{ response: SocketTokenResponse | null; unsupported: boolean }>;
}

/**
 * Holds the socket token in memory and keeps the socket authenticated.
 * One instance per SocketCluster client.
 */
export class SocketAuthManager {
    socket: any = null;

    private token: string | null = null;
    private expiresAt = 0;
    private source: TokenSource | null = null;
    private scoped: SocketTokenResponse | null = null;
    private unsupported = false;
    private inflight: Promise<string | null> | null = null;
    private refreshTimer: any = null;
    private recoverTimer: any = null;
    private recovering: Promise<void> = Promise.resolve();
    private authFailures = 0;
    private tracked = new Set<string>();
    private attempts = new Map<string, number>();
    private stopListeners: Array<() => void> = [];
    private destroyed = false;
    private getCustomerToken: () => string | null;
    private requestToken: (customerToken: string) => Promise<{ response: SocketTokenResponse | null; unsupported: boolean }>;

    constructor(options: SocketAuthManagerOptions) {
        this.getCustomerToken = options.getCustomerToken;
        this.requestToken = options.requestToken ?? requestCustomerSocketToken;
    }

    /** In-memory authEngine for socketClusterClient.create({ authEngine }). */
    authEngine = {
        saveToken: (_name: string, token: string) => {
            // Called with the token we just authenticated with, or one the server set.
            if (token && token !== this.token) {
                this.token = token;
                this.expiresAt = computeExpiresAt({ token });
            }
            return Promise.resolve(token);
        },
        removeToken: (_name: string) => {
            const old = this.token;
            this.clearToken();
            return Promise.resolve(old);
        },
        loadToken: async (_name: string) => {
            try {
                if (this.isFresh()) return this.token;
                return await this.fetchToken();
            } catch (_) {
                return null;
            }
        },
    };

    /** Attach to a created socket and start handling auth events. */
    attach(socket: any) {
        this.socket = socket;
        this.consume(socket.listener('deauthenticate'), () => {
            // Only react while connected; on (re)connect the handshake loads a token itself.
            if (this.isOpen()) this.scheduleRecover(true);
        });
        this.consume(socket.listener('kickOut'), ({ channel }) => {
            if (this.tracked.has(channel)) this.scheduleRecover(true);
        });
        this.consume(socket.listener('subscribeFail'), ({ channel }) => {
            if (this.tracked.has(channel)) this.scheduleRecover(true);
        });
        this.consume(socket.listener('subscribe'), ({ channel }) => {
            this.attempts.delete(channel);
        });
        this.consume(socket.listener('authenticate'), () => {
            this.authFailures = 0;
        });
    }

    track(channelName: string) {
        this.tracked.add(channelName);
    }

    untrack(channelName: string) {
        this.tracked.delete(channelName);
        this.attempts.delete(channelName);
    }

    untrackAll() {
        this.tracked.clear();
        this.attempts.clear();
    }

    /** Customer logged in (or switched): mint a customer token, authenticate, resubscribe. */
    async onLogin() {
        this.unsupported = false;
        this.scoped = null;
        this.authFailures = 0;
        this.attempts.clear();
        this.clearToken();
        await this.reauthenticate();
    }

    /** Customer logged out: drop the token and reconnect anonymously. */
    onLogout() {
        this.unsupported = false;
        this.scoped = null;
        this.authFailures = 0;
        this.attempts.clear();
        this.clearToken();
        const socket = this.socket;
        if (!socket) return;
        try {
            socket.disconnect();
            // The handshake calls loadToken, which now resolves to null => anonymous.
            socket.connect();
        } catch (err) {
            console.warn('[SocketAuth] Error while resetting the socket after logout:', err);
        }
    }

    /**
     * Use a checkout-scoped token (guest QPay). Ignored when a customer is logged
     * in, since the customer's own token already covers their checkouts.
     */
    async applyCheckoutToken(value: any) {
        const response = normalizeSocketToken(value);
        if (!response || this.getCustomerToken()) return;
        this.scoped = response;
        this.setToken(response, 'checkout');
        await this.authenticateCurrent();
    }

    destroy() {
        this.destroyed = true;
        clearTimeout(this.refreshTimer);
        clearTimeout(this.recoverTimer);
        this.stopListeners.forEach((stop) => stop());
        this.stopListeners = [];
        this.clearToken();
        this.scoped = null;
        this.untrackAll();
        this.socket = null;
    }

    // -- internals --------------------------------------------------------

    private isOpen() {
        return !!this.socket && this.socket.state === this.socket.OPEN;
    }

    private isFresh() {
        return !!this.token && this.expiresAt - Date.now() > EXPIRY_MARGIN_MS;
    }

    private clearToken() {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
        this.token = null;
        this.expiresAt = 0;
        this.source = null;
    }

    private setToken(response: SocketTokenResponse, source: TokenSource) {
        this.token = response.token;
        this.expiresAt = computeExpiresAt(response);
        this.source = source;
        this.scheduleRefresh();
    }

    /** Fetch a fresh token (deduplicated). Resolves to null for anonymous. */
    private fetchToken(): Promise<string | null> {
        if (this.inflight) return this.inflight;
        this.inflight = (async () => {
            try {
                const customerToken = this.getCustomerToken();
                if (customerToken && !this.unsupported) {
                    const { response, unsupported } = await this.requestToken(customerToken);
                    if (unsupported) this.unsupported = true;
                    if (response) {
                        this.setToken(response, 'customer');
                        return this.token;
                    }
                }
                // Guest checkout token: cannot be re-minted here, use it until it expires.
                if (!customerToken && this.scoped && computeExpiresAt(this.scoped) > Date.now()) {
                    this.setToken(this.scoped, 'checkout');
                    return this.token;
                }
                this.clearToken();
                return null;
            } finally {
                this.inflight = null;
            }
        })();
        return this.inflight;
    }

    private scheduleRefresh() {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
        // Checkout tokens cannot be refreshed client-side.
        if (this.destroyed || this.source !== 'customer' || !this.expiresAt) return;
        const delay = Math.max(this.expiresAt - Date.now() - EXPIRY_MARGIN_MS, MIN_REFRESH_DELAY_MS);
        this.refreshTimer = setTimeout(() => {
            this.refreshTimer = null;
            this.reauthenticate().catch(() => {});
        }, delay);
    }

    private async authenticateCurrent() {
        if (!this.token || !this.isOpen()) return;
        if (this.socket.signedAuthToken === this.token) return;
        if (this.authFailures >= MAX_AUTH_FAILURES) return;
        try {
            const status = await this.socket.authenticate(this.token);
            if (status && status.isAuthenticated === false) this.authFailures++;
        } catch (err) {
            this.authFailures++;
            console.warn('[SocketAuth] Socket authentication failed:', err?.message ?? err);
        }
    }

    /** Fetch a fresh token, authenticate the live socket, resubscribe tracked channels. */
    private async reauthenticate() {
        if (this.destroyed) return;
        await this.fetchToken();
        await this.authenticateCurrent();
        this.resubscribeTracked();
    }

    private resubscribeTracked() {
        if (!this.socket || this.destroyed) return;
        this.tracked.forEach((channelName) => {
            if (this.socket.isSubscribed(channelName, true)) return;
            const attempts = this.attempts.get(channelName) ?? 0;
            if (attempts >= MAX_RESUBSCRIBE_ATTEMPTS) return;
            this.attempts.set(channelName, attempts + 1);
            // Re-creating the subscription keeps existing channel consumers working:
            // channel data/events are routed by channel name.
            this.socket.subscribe(channelName);
        });
    }

    private scheduleRecover(forceFetch: boolean) {
        if (this.destroyed) return;
        clearTimeout(this.recoverTimer);
        this.recoverTimer = setTimeout(() => {
            this.recoverTimer = null;
            this.recovering = this.recovering
                .then(async () => {
                    if (forceFetch || !this.isFresh()) {
                        await this.fetchToken();
                    }
                    await this.authenticateCurrent();
                    this.resubscribeTracked();
                })
                .catch((err) => console.warn('[SocketAuth] Recovery failed:', err?.message ?? err));
        }, RECOVER_DEBOUNCE_MS);
    }

    private consume(iterable: any, handler: (data: any) => void) {
        let stopped = false;
        const iterator = iterable[Symbol.asyncIterator]();
        (async () => {
            while (!stopped) {
                const { value, done } = await iterator.next();
                if (done || stopped) break;
                try {
                    handler(value ?? {});
                } catch (err) {
                    console.warn('[SocketAuth] Event handler error:', err);
                }
            }
        })().catch(() => {});
        this.stopListeners.push(() => {
            stopped = true;
            if (typeof iterator.return === 'function') iterator.return();
        });
    }
}
