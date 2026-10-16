import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useCustomerRequest from './use-customer-request';
import { fetchUnreadCount } from '../commerce/notifications';

// One count shared by every bell badge, refreshed on demand.
let unread = 0;
const listeners = new Set<(count: number) => void>();

export function setUnreadCount(count: number) {
    unread = Math.max(0, count);
    listeners.forEach((listener) => listener(unread));
}

/** The signed-in customer's unread notification count and a way to refresh it. */
export default function useUnreadNotifications() {
    const { customer } = useAuth();
    const request = useCustomerRequest();
    const [count, setCount] = useState(unread);

    useEffect(() => {
        listeners.add(setCount);
        return () => {
            listeners.delete(setCount);
        };
    }, []);

    const refresh = useCallback(async () => {
        if (!customer) {
            setUnreadCount(0);
            return;
        }
        try {
            setUnreadCount(await fetchUnreadCount(request));
        } catch {
            // Keep the last known count; the inbox itself shows load errors.
        }
    }, [customer, request]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { count: customer ? count : 0, refresh };
}
