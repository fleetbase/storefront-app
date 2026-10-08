import { useEffect, useRef } from 'react';
import useStorefront from './use-storefront';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { apiRequest } from '../commerce/http';
import { checkCustomerSession } from '../commerce/session';
import { toast } from '../utils/toast';

/**
 * Check the restored customer session with the server once per token. If the server no
 * longer accepts it, sign out and say so, instead of every customer request failing.
 */
export default function useVerifySession() {
    const { storefront } = useStorefront();
    const { customer, logout } = useAuth() as any;
    const { t } = useLanguage();
    const token: string | null = customer?.token ?? customer?.getAttribute?.('token') ?? null;
    const checked = useRef<string | null>(null);

    useEffect(() => {
        const adapter = storefront?.getAdapter?.();
        if (!token || !adapter || checked.current === token) return;
        checked.current = token;
        let live = true;
        checkCustomerSession((path, options) =>
            apiRequest({ host: adapter.host, namespace: adapter.namespace, headers: adapter.headers }, path, { ...options, headers: { 'Customer-Token': token } })
        ).then((result) => {
            if (!live || result !== 'rejected') return;
            logout();
            toast.info(t('Auth.sessionExpired'));
        });
        return () => {
            live = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, storefront]);
}
