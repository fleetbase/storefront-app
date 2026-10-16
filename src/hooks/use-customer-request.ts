import { useCallback } from 'react';
import useStorefront from './use-storefront';
import { useAuth } from '../contexts/AuthContext';

export type CustomerRequest = (path: string, data?: Record<string, any>, method?: 'GET' | 'POST' | 'PUT' | 'DELETE') => Promise<any>;

/**
 * Storefront API requests sent as the signed-in customer when there is one (so answers
 * are about them) and anonymously otherwise.
 */
export default function useCustomerRequest(): CustomerRequest {
    const { storefront } = useStorefront();
    const { customer } = useAuth();

    return useCallback<CustomerRequest>(
        (path, data = {}, method = 'GET') => {
            if (customer?.performAuthorizedRequest) return customer.performAuthorizedRequest(path, data, method);
            const adapter = storefront?.getAdapter?.();
            if (!adapter) return Promise.reject(new Error('Storefront is not ready'));
            if (method === 'GET') return adapter.get(path, data);
            if (method === 'POST') return adapter.post(path, data);
            if (method === 'PUT') return adapter.put(path, data);
            return adapter.delete(path);
        },
        [customer, storefront]
    );
}
