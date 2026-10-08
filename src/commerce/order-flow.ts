/**
 * An order's steps from its own order config (GET orders/{id}/activity-flow): where it
 * has been, where it is, and where it is expected to go. Orders on the default
 * storefront config keep the app's own wording (see order-progress.ts); orders on a
 * custom config, such as "Created → Dispatched → Started → Enroute → Completed", show
 * the merchant's steps.
 */

export type FlowStep = { code: string; label: string; details: string | null; state: 'done' | 'current' | 'todo'; at: string | null };

export type OrderFlow = { configKey: string | null; status: string | null; canceled: boolean; completed: boolean; steps: FlowStep[] };

export type FlowRequest = (path: string) => Promise<any>;

/** Order configs whose steps the app already words for customers. */
export const DEFAULT_CONFIG_KEYS = ['storefront'];

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

export function parseOrderFlow(json: any): OrderFlow | null {
    if (!json || !Array.isArray(json.steps)) return null;
    const steps = json.steps
        .filter((step: any) => text(step?.code))
        .map(
            (step: any): FlowStep => ({
                code: String(step.code),
                label: text(step.label) ?? String(step.code),
                details: text(step.details),
                state: step.state === 'done' || step.state === 'current' ? step.state : 'todo',
                at: text(step.reached_at),
            })
        );
    return { configKey: text(json.order_config?.key), status: text(json.status), canceled: json.canceled === true, completed: json.completed === true, steps };
}

/** Whether to show the order's own steps rather than the app's default wording. */
export function usesCustomFlow(flow: OrderFlow | null | undefined): flow is OrderFlow {
    return !!flow && flow.steps.length > 0 && !!flow.configKey && !DEFAULT_CONFIG_KEYS.includes(flow.configKey);
}

/** The step the order is on: the current one, or the last done one once it has finished. */
export function currentStep(flow: OrderFlow): FlowStep | null {
    return flow.steps.find((step) => step.state === 'current') ?? [...flow.steps].reverse().find((step) => step.state === 'done') ?? null;
}

export async function fetchOrderFlow(request: FlowRequest, orderId: string): Promise<OrderFlow | null> {
    return parseOrderFlow(await request(`orders/${encodeURIComponent(orderId)}/activity-flow`));
}
