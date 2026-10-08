import { useCallback } from 'react';
import useStorefront from './use-storefront';
import { useAuth } from '../contexts/AuthContext';
import { adapterTarget, apiRequest } from '../commerce/http';
import type { ChatRequest } from '../commerce/order-chat';

/** Order chat requests as the signed-in customer, keeping refusal reasons (409, 423 …). */
export default function useChatRequest(): ChatRequest {
    const { storefront } = useStorefront();
    const { customer } = useAuth();

    return useCallback<ChatRequest>(
        (path, options = {}) => {
            const adapter = storefront?.getAdapter?.() ?? {};
            const token = customer?.token ?? customer?.getAttribute?.('token');
            return apiRequest(adapterTarget(adapter), path, { ...options, headers: token ? { 'Customer-Token': token } : {} });
        },
        [customer, storefront]
    );
}
