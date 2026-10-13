import { hasBalanceDue, keepRefreshing, parseOrderPayment, paymentBadge, receiptFingerprint, safeLink } from '../../src/commerce/order-payment';

const reported = (payment: Record<string, any>, extra: Record<string, any> = {}) => ({
    id: 'order_1',
    meta: { total: 8400, currency: 'SGD', gateway: 'stripe', payment, ...extra },
    payload: {},
});

describe('order payment', () => {
    test('reads the summary the server keeps on meta.payment', () => {
        const payment = parseOrderPayment(
            reported({
                state: 'partially_refunded',
                total: 8400,
                amount_paid: 8990,
                amount_refunded: '590',
                amount_credited: 0,
                balance_due: 0,
                cod_amount: 0,
                currency: 'SGD',
                payment_link: null,
                store_credit_code: ' CREDIT-590 ',
                adjustments: [{ type: 'refund', amount: 590, gateway: 'stripe', reference: 're_1', reason: 'Item removed', at: '2026-10-13T12:48:00Z' }, null],
            })
        );
        expect(payment).toEqual({
            state: 'partially_refunded',
            total: 8400,
            amountPaid: 8990,
            amountRefunded: 590,
            amountCredited: 0,
            balanceDue: 0,
            codAmount: 0,
            currency: 'SGD',
            paymentLink: null,
            storeCreditCode: 'CREDIT-590',
            adjustments: [{ type: 'refund', amount: 590, gateway: 'stripe', reference: 're_1', reason: 'Item removed', at: '2026-10-13T12:48:00Z' }],
            reported: true,
        });
        expect(paymentBadge(payment)).toEqual({ key: 'partlyRefunded', tone: 'neutral' });
    });

    test('reads a top-level payment and an SDK order', () => {
        expect(parseOrderPayment({ payment: { state: 'paid', amount_paid: 100 } })).toMatchObject({ state: 'paid', amountPaid: 100, reported: true });
        const sdk = { getAttribute: (key: string) => (({ 'meta.payment': { state: 'refunded', amount_refunded: 100 } }) as Record<string, any>)[key] };
        expect(parseOrderPayment(sdk)).toMatchObject({ state: 'refunded', amountRefunded: 100 });
    });

    test('works out the state when the server sends none', () => {
        expect(parseOrderPayment(reported({ balance_due: 500 }))?.state).toBe('balance_due');
        expect(parseOrderPayment(reported({ cod_amount: 500 }))?.state).toBe('to_collect');
        expect(parseOrderPayment(reported({ amount_refunded: 500 }))?.state).toBe('partially_refunded');
        expect(parseOrderPayment(reported({ state: 'weird' }))?.state).toBe('paid');
    });

    test('falls back to the gateway and cash on delivery for older orders', () => {
        expect(parseOrderPayment({ meta: { gateway: 'qpay', total: 5000 }, payload: {} })).toMatchObject({ state: 'paid', amountPaid: 5000, codAmount: 0, reported: false });
        expect(parseOrderPayment({ meta: { gateway: 'cash', total: 5000 }, payload: {} })).toMatchObject({ state: 'to_collect', codAmount: 5000, reported: false });
        expect(parseOrderPayment({ meta: { total: 5000 }, payload: { cod_amount: 4200 } })).toMatchObject({ state: 'to_collect', codAmount: 4200 });
        expect(parseOrderPayment({ meta: {}, payload: {} })).toBeNull();
        expect(parseOrderPayment(null)).toBeNull();
    });

    test('only opens web payment links', () => {
        expect(parseOrderPayment(reported({ state: 'balance_due', balance_due: 500, payment_link: 'https://pay.test/abc' }))?.paymentLink).toBe('https://pay.test/abc');
        expect(parseOrderPayment(reported({ payment_link: 'javascript:alert(1)' }))?.paymentLink).toBeNull();
        expect(safeLink('  http://pay.test ')).toBe('http://pay.test');
        expect(safeLink(42)).toBeNull();
    });

    test('badges each state', () => {
        const badge = (payment: Record<string, any>) => paymentBadge(parseOrderPayment(reported(payment)))?.key;
        expect(badge({ state: 'paid' })).toBe('paid');
        expect(badge({ state: 'to_collect', cod_amount: 100 })).toBe('payOnDelivery');
        expect(badge({ state: 'refunded' })).toBe('refunded');
        expect(badge({ state: 'unpaid' })).toBe('unpaid');
        expect(badge({ state: 'paid', balance_due: 100 })).toBe('balanceDue');
        expect(paymentBadge(null)).toBeNull();
    });

    test('keeps refreshing an ended order only while a balance is due', () => {
        const due = parseOrderPayment(reported({ state: 'balance_due', balance_due: 500 }));
        const paid = parseOrderPayment(reported({ state: 'paid' }));
        expect(hasBalanceDue(due)).toBe(true);
        expect(keepRefreshing({ settled: false, payment: paid })).toBe(true);
        expect(keepRefreshing({ settled: true, payment: due })).toBe(true);
        expect(keepRefreshing({ settled: true, payment: paid })).toBe(false);
        expect(keepRefreshing({ settled: true, payment: null })).toBe(false);
    });

    test('fingerprints what a tax receipt was issued for', () => {
        const before = receiptFingerprint(reported({ state: 'paid', amount_paid: 8400 }));
        expect(receiptFingerprint(reported({ state: 'paid', amount_paid: 8400 }))).toBe(before);
        expect(receiptFingerprint(reported({ state: 'partially_refunded', amount_paid: 8400, amount_refunded: 500 }))).not.toBe(before);
        expect(receiptFingerprint(reported({ state: 'paid', amount_paid: 8400 }, { total: 7900 }))).not.toBe(before);
    });
});
