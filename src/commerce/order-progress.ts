/**
 * Where an order is in the storefront flow, as the customer sees it. The order status
 * codes come from the storefront order config:
 *
 *   created → accepted → dispatched → started → preparing
 *     delivery: → driver_enroute_to_store → driver_picked_up → driver_enroute → completed
 *     pickup:   → pickup_ready → picked_up (or completed)
 *   canceled from any point.
 */

export type OrderPhase = 'placed' | 'accepted' | 'preparing' | 'driverToStore' | 'pickedUp' | 'onTheWay' | 'delivered' | 'ready' | 'collected' | 'canceled';

export type StepKey = 'placed' | 'preparing' | 'pickedUp' | 'onTheWay' | 'delivered' | 'ready' | 'collected';

export type ProgressStep = { key: StepKey; state: 'done' | 'current' | 'todo'; at: string | null };

export type OrderProgress = { phase: OrderPhase; steps: ProgressStep[]; canceled: boolean; finished: boolean };

const DELIVERY_STEPS: StepKey[] = ['placed', 'preparing', 'pickedUp', 'onTheWay', 'delivered'];
const PICKUP_STEPS: StepKey[] = ['placed', 'preparing', 'ready', 'collected'];

const PHASES: Record<string, OrderPhase> = {
    created: 'placed',
    pending: 'placed',
    accepted: 'accepted',
    dispatched: 'accepted',
    started: 'accepted',
    preparing: 'preparing',
    driver_enroute_to_store: 'driverToStore',
    driver_assigned: 'preparing',
    driver_picked_up: 'pickedUp',
    driver_enroute: 'onTheWay',
    enroute: 'onTheWay',
    pickup_ready: 'ready',
    ready: 'ready',
    picked_up: 'collected',
    completed: 'delivered',
    delivered: 'delivered',
    canceled: 'canceled',
    cancelled: 'canceled',
    order_canceled: 'canceled',
};

/** Which step each phase sits on. */
const PHASE_STEP: Record<OrderPhase, StepKey> = {
    placed: 'placed',
    accepted: 'preparing',
    preparing: 'preparing',
    driverToStore: 'preparing',
    pickedUp: 'pickedUp',
    onTheWay: 'onTheWay',
    delivered: 'delivered',
    ready: 'ready',
    collected: 'collected',
    canceled: 'placed',
};

export function orderPhase(status: unknown, isPickup = false): OrderPhase {
    const phase = PHASES[String(status ?? '').toLowerCase()] ?? 'placed';
    // A completed pickup order was collected, not delivered.
    if (isPickup && phase === 'delivered') return 'collected';
    if (!isPickup && phase === 'collected') return 'delivered';
    return phase;
}

/**
 * Steps for the timeline, each done, current or still to come, with the time it was
 * reached when the tracking history has it.
 */
export function orderProgress({ status, isPickup = false, trackingStatuses = [], createdAt = null }: { status: unknown; isPickup?: boolean; trackingStatuses?: any[] | null; createdAt?: string | null }): OrderProgress {
    const phase = orderPhase(status, isPickup);
    const keys = isPickup ? PICKUP_STEPS : DELIVERY_STEPS;
    const canceled = phase === 'canceled';
    const finished = phase === 'delivered' || phase === 'collected';
    const currentIndex = canceled ? 0 : keys.indexOf(PHASE_STEP[phase]);

    // The first time each step was reached, from the tracking history.
    const reached: Partial<Record<StepKey, string>> = { placed: createdAt ?? undefined };
    for (const entry of Array.isArray(trackingStatuses) ? trackingStatuses : []) {
        const entryPhase = orderPhase(entry?.code ?? entry?.status, isPickup);
        if (entryPhase === 'canceled') continue;
        const key = PHASE_STEP[entryPhase];
        const at = entry?.created_at ?? null;
        if (at && (!reached[key] || String(at) < String(reached[key]))) reached[key] = at;
    }

    const steps = keys.map((key, index): ProgressStep => {
        const state = canceled ? (index === 0 ? 'done' : 'todo') : index < currentIndex || (finished && index === currentIndex) ? 'done' : index === currentIndex ? 'current' : 'todo';
        return { key, state, at: state === 'todo' ? null : (reached[key] ?? null) };
    });

    return { phase, steps, canceled, finished };
}

/** A short name for the driver card: "Ravi K." from "Ravi Kumar". */
export function shortName(name: unknown): string {
    const parts = String(name ?? '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
