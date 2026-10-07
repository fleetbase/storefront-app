/**
 * Asks the customer, from anywhere (such as the cart context), whether to replace their
 * cart with items from another store, or tells them an item cannot join the cart. A host
 * component shows the sheet and answers; without a host the caller falls back to a dialog.
 */
export type StoreSwitchRequest =
    | { kind: 'replace'; fromStoreId: string | null; toStoreId: string | null; itemCount: number; total: string | null }
    | { kind: 'currency'; cartCurrency: string | null; itemCurrency: string | null; toStoreId: string | null };

type Pending = { request: StoreSwitchRequest; resolve: (accepted: boolean) => void };
type Host = (pending: Pending) => void;

let host: Host | null = null;

/** Registers the component that presents requests. Returns an unregister function. */
export function registerStoreSwitchHost(present: Host): () => void {
    host = present;
    return () => {
        if (host === present) host = null;
    };
}

export function hasStoreSwitchHost(): boolean {
    return host !== null;
}

/** Resolves true when the customer accepts (replaces the cart), false otherwise; null when no host is mounted. */
export function requestStoreSwitch(request: StoreSwitchRequest): Promise<boolean> | null {
    const present = host;
    if (!present) return null;
    return new Promise<boolean>((resolve) => present({ request, resolve }));
}
