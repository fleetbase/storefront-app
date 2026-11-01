import type { Appearance, Stripe } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js/pure';
import { config } from './index';
import { basePath } from '../navigation/web-linking';

/**
 * Stripe.js for the web build. It loads from js.stripe.com the first time a card form is
 * shown, not with the app. Null without a publishable key (STRIPE_KEY).
 */
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> | null {
    const key = config('STRIPE_KEY');
    if (typeof key !== 'string' || !key.startsWith('pk_')) return null;
    if (!stripePromise) {
        stripePromise = loadStripe(key).catch((error) => {
            console.warn('[stripe] Could not load Stripe.js', error);
            stripePromise = null;
            return null;
        });
    }
    return stripePromise;
}

/** Where Stripe sends the customer back after a bank's check (3-D Secure) or a redirect payment. */
export function stripeReturnUrl(path = 'checkout/card'): string {
    return `${window.location.origin}${basePath()}/${path}`;
}

const val = (theme: any, key: string, fallback: string) => theme?.[key]?.val ?? fallback;

/** The card form in the app's colors and shape. */
export function stripeAppearance(theme: any, scheme: 'light' | 'dark', borderRadius: number): Appearance {
    return {
        theme: scheme === 'dark' ? 'night' : 'stripe',
        variables: {
            colorPrimary: val(theme, 'primary', '#2563eb'),
            colorBackground: val(theme, 'surface', scheme === 'dark' ? '#111827' : '#ffffff'),
            colorText: val(theme, 'textPrimary', scheme === 'dark' ? '#f9fafb' : '#111827'),
            colorTextSecondary: val(theme, 'textSecondary', '#6b7280'),
            colorDanger: val(theme, 'error', '#dc2626'),
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            borderRadius: `${borderRadius}px`,
            spacingUnit: '4px',
        },
        rules: {
            '.Input': { borderColor: val(theme, 'borderColor', scheme === 'dark' ? '#374151' : '#e5e7eb'), boxShadow: 'none' },
        },
    };
}
