/**
 * Asks the customer, from anywhere (such as the cart context), whether to replace their
 * cart with items from another store, or tells them an item cannot join the cart. A host
 * component shows the sheet and answers; without a host the caller falls back to a dialog.
 * Screens presented as native modals mount their own host so the sheet shows above them.
 */
export type StoreSwitchRequest =
    | { kind: 'replace'; fromStoreId: string | null; toStoreId: string | null; itemCount: number; total: string | null }
    | { kind: 'currency'; cartCurrency: string | null; itemCurrency: string | null; toStoreId: string | null };

type Pending = { request: StoreSwitchRequest; resolve: (accepted: boolean) => void };
type Host = (pending: Pending) => void;

/**
 * Mounted hosts, newest last. The newest answers: a modal screen (such as a product opened
 * as a modal) mounts its own, because a sheet from the root cannot show above a native modal
 * and the customer would never see the question.
 */
const hosts: Host[] = [];

/** Registers a component that presents requests. Returns an unregister function. */
export function registerStoreSwitchHost(present: Host): () => void {
    hosts.push(present);
    return () => {
        const index = hosts.lastIndexOf(present);
        if (index !== -1) hosts.splice(index, 1);
    };
}

export function hasStoreSwitchHost(): boolean {
    return hosts.length > 0;
}

/** Resolves true when the customer accepts (replaces the cart), false otherwise; null when no host is mounted. */
export function requestStoreSwitch(request: StoreSwitchRequest): Promise<boolean> | null {
    const present = hosts[hosts.length - 1];
    if (!present) return null;
    return new Promise<boolean>((resolve) => present({ request, resolve }));
}
