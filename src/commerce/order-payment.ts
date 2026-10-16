/**
 * How an order stands with money: what was paid, refunded or credited, what is still due
 * and how. The server keeps a summary on the order's own meta (`meta.payment`), updated at
 * capture, cash collection, every refund, store credit or extra charge, and every edit:
 *
 *   { state: paid | to_collect | unpaid | refunded | partially_refunded | balance_due,
 *     total, amount_paid, amount_refunded, amount_credited, balance_due, cod_amount, currency,
 *     payment_link, store_credit_code, supports_partial_refund,
 *     adjustments: [{ type, amount, gateway, reference, reason, at }] }
 *
 * Orders placed before the summary existed have none; their state is worked out from the
 * gateway and any cash to collect, as the app always did.
 */

export type PaymentState = 'paid' | 'to_collect' | 'unpaid' | 'refunded' | 'partially_refunded' | 'balance_due';

export type PaymentAdjustment = { type: string; amount: number; gateway: string | null; reference: string | null; reason: string | null; at: string | null };

export type OrderPayment = {
    state: PaymentState;
    total: number | null;
    amountPaid: number;
    amountRefunded: number;
    amountCredited: number;
    balanceDue: number;
    codAmount: number;
    currency: string | null;
    /** Where the customer pays the balance (a checkout for the difference), https only. */
    paymentLink: string | null;
    storeCreditCode: string | null;
    adjustments: PaymentAdjustment[];
    /** False when the summary was worked out on the device (an older order). */
    reported: boolean;
};

export type PaymentBadgeKey = 'paid' | 'payOnDelivery' | 'refunded' | 'partlyRefunded' | 'balanceDue' | 'unpaid';
export type PaymentBadge = { key: PaymentBadgeKey; tone: 'success' | 'warning' | 'neutral' | 'error' };

const STATES: PaymentState[] = ['paid', 'to_collect', 'unpaid', 'refunded', 'partially_refunded', 'balance_due'];
const CASH_GATEWAYS = ['cash', 'cod'];

const amount = (value: unknown): number => {
    const number = typeof value === 'string' ? Number(value.replace(/[^\d.-]/g, '')) : Number(value);
    return Number.isFinite(number) ? number : 0;
};

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

/** Only web links open from the app; anything else (javascript:, intent:) is ignored. */
export function safeLink(value: unknown): string | null {
    const link = text(value);
    return link && /^https?:\/\//i.test(link) ? link : null;
}

const attribute = (order: any, key: string): any => (typeof order?.getAttribute === 'function' ? order.getAttribute(key) : key.split('.').reduce((value, part) => value?.[part], order));

function parseAdjustment(json: any): PaymentAdjustment | null {
    if (!json || typeof json !== 'object') return null;
    return {
        type: text(json.type) ?? 'adjustment',
        amount: amount(json.amount),
        gateway: text(json.gateway),
        reference: text(json.reference),
        reason: text(json.reason),
        at: text(json.at),
    };
}

/**
 * The order's payment summary from an SDK order or plain order JSON: `meta.payment` when the
 * server recorded it (a top-level `payment` is read too), otherwise worked out from the
 * gateway and cash on delivery. Null for an order with nothing to go on.
 */
export function parseOrderPayment(order: any): OrderPayment | null {
    const summary = attribute(order, 'meta.payment') ?? attribute(order, 'payment');
    if (summary && typeof summary === 'object') {
        const state = STATES.includes(summary.state) ? (summary.state as PaymentState) : null;
        const balanceDue = Math.max(0, amount(summary.balance_due));
        const amountRefunded = Math.max(0, amount(summary.amount_refunded));
        const codAmount = Math.max(0, amount(summary.cod_amount));
        return {
            state: state ?? (balanceDue > 0 ? 'balance_due' : codAmount > 0 ? 'to_collect' : amountRefunded > 0 ? 'partially_refunded' : 'paid'),
            total: summary.total != null ? amount(summary.total) : null,
            amountPaid: Math.max(0, amount(summary.amount_paid)),
            amountRefunded,
            amountCredited: Math.max(0, amount(summary.amount_credited)),
            balanceDue,
            codAmount,
            currency: text(summary.currency),
            paymentLink: safeLink(summary.payment_link),
            storeCreditCode: text(summary.store_credit_code),
            adjustments: (Array.isArray(summary.adjustments) ? summary.adjustments : []).map(parseAdjustment).filter(Boolean) as PaymentAdjustment[],
            reported: true,
        };
    }

    // An older order: cash still to collect, or paid through its gateway at checkout.
    const codAmount = Math.max(0, amount(attribute(order, 'payload.cod_amount')));
    const gateway = (text(attribute(order, 'meta.gateway')) ?? text(attribute(order, 'payload.payment_method')) ?? '').toLowerCase();
    if (!codAmount && !gateway) return null;
    const cash = codAmount > 0 || CASH_GATEWAYS.includes(gateway);
    const total = attribute(order, 'meta.total') != null ? amount(attribute(order, 'meta.total')) : null;
    return {
        state: cash ? 'to_collect' : 'paid',
        total,
        amountPaid: cash ? 0 : (total ?? 0),
        amountRefunded: 0,
        amountCredited: 0,
        balanceDue: 0,
        codAmount: cash ? codAmount || (total ?? 0) : 0,
        currency: text(attribute(order, 'meta.currency')),
        paymentLink: null,
        storeCreditCode: null,
        adjustments: [],
        reported: false,
    };
}

/** What the customer still owes now: a balance to pay online. Cash on delivery is shown apart. */
export function hasBalanceDue(payment: OrderPayment | null | undefined): boolean {
    return !!payment && (payment.state === 'balance_due' || payment.balanceDue > 0);
}

/** The badge for the payment's state (Paid, To pay on delivery, Refunded …). */
export function paymentBadge(payment: OrderPayment | null | undefined): PaymentBadge | null {
    if (!payment) return null;
    if (hasBalanceDue(payment)) return { key: 'balanceDue', tone: 'warning' };
    switch (payment.state) {
        case 'paid':
            return { key: 'paid', tone: 'success' };
        case 'to_collect':
            return { key: 'payOnDelivery', tone: 'warning' };
        case 'refunded':
            return { key: 'refunded', tone: 'neutral' };
        case 'partially_refunded':
            return { key: 'partlyRefunded', tone: 'neutral' };
        case 'unpaid':
            return { key: 'unpaid', tone: 'error' };
        default:
            return null;
    }
}

/**
 * Whether the order screen should keep refreshing: while the order is under way, and after
 * it ends for as long as a balance is still due (paying it updates the order).
 */
export function keepRefreshing({ settled, payment }: { settled: boolean; payment: OrderPayment | null | undefined }): boolean {
    return !settled || hasBalanceDue(payment);
}

/**
 * A fingerprint of what a cached tax receipt was issued for: the order total and the
 * payment summary's money. A different one means the cached receipt is out of date.
 */
export function receiptFingerprint(order: any): string {
    const payment = parseOrderPayment(order);
    const total = amount(attribute(order, 'meta.total'));
    return [total, payment?.amountPaid ?? 0, payment?.amountRefunded ?? 0, payment?.amountCredited ?? 0, payment?.balanceDue ?? 0].join(':');
}
