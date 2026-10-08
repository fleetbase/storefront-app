import { checkCustomerSession, isSessionRejected } from '../../src/commerce/session';
import { ApiError } from '../../src/commerce/http';

describe('isSessionRejected', () => {
    it('treats 401 and "Not authorized" refusals as a dead session', () => {
        expect(isSessionRejected(new ApiError('Unauthenticated.', 401, null))).toBe(true);
        expect(isSessionRejected(new ApiError('Not authorized to view customers places', 400, null))).toBe(true);
        expect(isSessionRejected(new ApiError('Not authorised', 403, null))).toBe(true);
    });

    it('ignores network failures, server errors and other refusals', () => {
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
