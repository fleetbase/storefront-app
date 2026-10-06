import { useCallback } from 'react';
import useStorefront from './use-storefront';
import { useAuth } from '../contexts/AuthContext';
import type { Request } from '../commerce/reviews';

/**
 * Review API requests, sent as the signed-in customer when there is one (so `is_mine`
 * and eligibility are about them) and anonymously otherwise.
 */
export default function useReviewRequest(): Request {
    const { storefront } = useStorefront();
    const { customer } = useAuth();

    return useCallback<Request>(
        (path, data = {}, method = 'GET') => {
            if (customer?.performAuthorizedRequest) return customer.performAuthorizedRequest(path, data, method);
            const adapter = storefront?.getAdapter?.();
            if (!adapter) return Promise.reject(new Error('Storefront is not ready'));
            return method === 'GET' ? adapter.get(path, data) : method === 'POST' ? adapter.post(path, data) : adapter.delete(path);
        },
        [customer, storefront]
    );
}
