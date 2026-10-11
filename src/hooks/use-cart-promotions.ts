import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Cart } from '@fleetbase/storefront';
import useCart from './use-cart';
import useStorefront from './use-storefront';
import { NO_PROMOTIONS, PromoCodeError, applyPromoCode, fetchCartPromotions, promotionHints, removePromoCode, type CartPromotions, type PromoReason, type PromotionHint } from '../commerce/promotions';

let publicPromotionsCache: { at: number; list: any[] } | null = null;
const PUBLIC_PROMOTIONS_TTL = 5 * 60 * 1000;

/**
 * The discounts the server applies to the current cart, plus promo-code actions and
 * "spend X more" hints. Pass `pickup` and the service quote at checkout so free-delivery
 * promotions are priced the same way the order will be.
 */
export default function useCartPromotions({ pickup = false, serviceQuoteId = null, hints = false }: { pickup?: boolean; serviceQuoteId?: string | null; hints?: boolean } = {}) {
    const { storefront } = useStorefront();
    const [cart, updateCart] = useCart();
    const adapter = storefront?.getAdapter?.();
    const cartId: string | null = cart?.id ?? null;
    const [promotions, setPromotions] = useState<CartPromotions>(NO_PROMOTIONS);
    const [publicPromotions, setPublicPromotions] = useState<any[]>(publicPromotionsCache?.list ?? []);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState<PromoReason | null>(null);
    const request = useRef(0);

    // Re-price whenever what the server prices on changes.
    const items = cart?.contents?.() ?? [];
    const signature = `${cartId}|${cart?.getAttribute?.('updated_at') ?? ''}|${items.length}|${cart?.subtotal?.() ?? 0}|${pickup}|${serviceQuoteId}`;

    useEffect(() => {
        if (!adapter || !cartId || items.length === 0) {
            setPromotions(NO_PROMOTIONS);
            return;
        }
        const id = ++request.current;
        setLoading(true);
        fetchCartPromotions(adapter, cartId, { pickup, serviceQuoteId })
            .then((result) => id === request.current && setPromotions(result))
            .catch(() => id === request.current && setPromotions(NO_PROMOTIONS))
            .finally(() => id === request.current && setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adapter, signature]);

    useEffect(() => {
        if (!hints || !adapter) return;
        if (publicPromotionsCache && Date.now() - publicPromotionsCache.at < PUBLIC_PROMOTIONS_TTL) {
            setPublicPromotions(publicPromotionsCache.list);
            return;
        }
        let active = true;
        adapter
            .get('promotions')
            .then((list: any) => {
                const promotionsList = Array.isArray(list) ? list : [];
                publicPromotionsCache = { at: Date.now(), list: promotionsList };
                if (active) setPublicPromotions(promotionsList);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [adapter, hints]);

    const adopt = useCallback(
        (json: any, next: CartPromotions) => {
            if (json && adapter) updateCart(new Cart(json, adapter));
            setPromotions(next);
        },
        [adapter, updateCart]
    );

    const apply = useCallback(
        async (code: string) => {
            if (!adapter || !cartId) return false;
            setApplying(true);
            setError(null);
            try {
                const result = await applyPromoCode(adapter, cartId, code);
                adopt(result.cart, result.promotions);
                return true;
            } catch (applyError: any) {
                setError(applyError instanceof PromoCodeError ? applyError.reason : 'unknown');
                return false;
            } finally {
                setApplying(false);
            }
        },
        [adapter, adopt, cartId]
    );

    const remove = useCallback(
        async (code: string) => {
            if (!adapter || !cartId) return;
            setApplying(true);
            setError(null);
            try {
                const result = await removePromoCode(adapter, cartId, code);
                adopt(result.cart, result.promotions);
            } catch {
                setError('unknown');
            } finally {
                setApplying(false);
            }
        },
        [adapter, adopt, cartId]
    );

    const codes: string[] = useMemo(() => {
        const list = cart?.getAttribute?.('promo_codes');
        return Array.isArray(list) ? list : [];
    }, [cart]);

    const hintList: PromotionHint[] = useMemo(() => {
        if (!hints) return [];
        const storeSubtotals: Record<string, number> = {};
        for (const item of items) {
            const storeId = item?.store_id ?? item?.store?.id;
            if (storeId) storeSubtotals[storeId] = (storeSubtotals[storeId] ?? 0) + Number(item?.subtotal ?? 0);
        }
        return promotionHints(publicPromotions, {
            subtotal: cart?.subtotal?.() ?? 0,
            storeSubtotals,
            appliedIds: promotions.applied.map((applied) => applied.promotionId),
            currency: cart?.getAttribute?.('currency') ?? null,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hints, publicPromotions, promotions, signature]);

    return { promotions, codes, hints: hintList, loading, applying, error, clearError: () => setError(null), apply, remove };
}
