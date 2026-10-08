import { checkCustomerSession, isSessionRejected } from '../../src/commerce/session';
import { ApiError } from '../../src/commerce/http';

describe('isSessionRejected', () => {
    it('treats the storefront\'s "Not authorized" customer refusal as a dead session', () => {
        expect(isSessionRejected(new ApiError('Not authorized to view customers places', 400, null))).toBe(true);
        expect(isSessionRejected(new ApiError('Not authorised', 403, null))).toBe(true);
    });

    it('ignores network failures, server errors and other refusals', () => {
        // A 401 is the storefront key being refused, not the customer token.
        expect(isSessionRejected(new ApiError('Unauthenticated.', 401, null))).toBe(false);
        expect(isSessionRejected(new ApiError('Network request failed', 0, 'network'))).toBe(false);
        expect(isSessionRejected(new ApiError('Server Error', 500, null))).toBe(false);
        expect(isSessionRejected(new ApiError('Validation failed', 400, null))).toBe(false);
        expect(isSessionRejected(new ApiError('Forbidden', 403, null))).toBe(false);
        expect(isSessionRejected(null)).toBe(false);
        expect(isSessionRejected({})).toBe(false);
    });
});

describe('checkCustomerSession', () => {
    it('asks for one saved place with the customer token', async () => {
        const request = jest.fn().mockResolvedValue([]);
        await expect(checkCustomerSession(request)).resolves.toBe('valid');
        expect(request).toHaveBeenCalledWith('customers/places', { query: { limit: 1 } });
    });

    it('reports a refusal as rejected and anything else as unknown', async () => {
        await expect(checkCustomerSession(jest.fn().mockRejectedValue(new ApiError('Not authorized to view customers places', 400, null)))).resolves.toBe('rejected');
        await expect(checkCustomerSession(jest.fn().mockRejectedValue(new ApiError('Network request failed', 0, 'network')))).resolves.toBe('unknown');
    });
});

describe('adapterTarget', () => {
    const { adapterTarget } = require('../../src/commerce/http');

    it('reads the browser adapter headers', () => {
        expect(adapterTarget({ host: 'https://api.test', namespace: 'storefront/v1', headers: { Authorization: 'Bearer store_key' } })).toEqual({
            host: 'https://api.test',
            namespace: 'storefront/v1',
            headers: { Authorization: 'Bearer store_key' },
        });
    });

    it('reads the native (axios) adapter headers, common ones first', () => {
        const adapter = {
            host: 'https://api.test',
            namespace: 'storefront/v1',
            axiosInstance: { defaults: { headers: { common: { Accept: 'application/json, text/plain' }, Authorization: 'Bearer store_key', 'User-Agent': '@fleetbase/sdk;node', get: {} } } },
        };
        expect(adapterTarget(adapter)).toEqual({
            host: 'https://api.test',
            namespace: 'storefront/v1',
            headers: { Accept: 'application/json, text/plain', Authorization: 'Bearer store_key', 'User-Agent': '@fleetbase/sdk;node' },
        });
    });

    it('copes with a missing adapter', () => {
        expect(adapterTarget(undefined)).toEqual({ host: undefined, namespace: undefined, headers: {} });
    });
});
