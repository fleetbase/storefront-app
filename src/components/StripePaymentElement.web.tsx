import React, { useEffect, useMemo, useState } from 'react';
import { YStack, useTheme } from 'tamagui';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useStripeCheckoutContext } from '../contexts/StripeCheckoutContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useBranding } from '../branding/BrandingProvider';
import { getStripe, stripeAppearance } from '../utils/stripe-web';
import { Skeleton, UIText, radius } from '../ui';

/** Hands Stripe and the form to the checkout, and reports when the card is complete. */
const PaymentForm = () => {
    const stripe = useStripe();
    const elements = useElements();
    const { attachStripe, handlePaymentElementChange } = useStripeCheckoutContext();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        attachStripe(stripe, elements);
        return () => attachStripe(null, null);
    }, [attachStripe, stripe, elements]);

    return (
        <YStack>
            {!ready && <Skeleton height={140} radius={radius.button} />}
            <div style={ready ? undefined : { height: 0, overflow: 'hidden' }}>
                <PaymentElement options={{ layout: 'tabs', paymentMethodOrder: ['card'], wallets: { applePay: 'never', googlePay: 'never' } }} onReady={() => setReady(true)} onChange={handlePaymentElementChange} />
            </div>
        </YStack>
    );
};

/**
 * The card form of a web checkout: Stripe's Payment Element, in the app's colors. No
 * PaymentIntent exists until the customer places the order (see use-stripe-checkout.web.ts).
 */
const StripePaymentElement = () => {
    const theme = useTheme();
    const { t } = useLanguage();
    const { scheme } = useBranding();
    const { customer, elementsOptions } = useStripeCheckoutContext();
    const stripePromise = getStripe();
    const appearance = useMemo(() => stripeAppearance(theme, scheme, radius.button), [theme, scheme]);

    if (!customer) {
        return <UIText tone='secondary'>{t('StripePaymentSheet.loginToCheckout')}</UIText>;
    }

    if (!stripePromise) {
        return <UIText tone='error'>{t('StripePaymentElement.notConfigured')}</UIText>;
    }

    return (
        <Elements stripe={stripePromise} options={{ ...elementsOptions, appearance, loader: 'never' }}>
            <PaymentForm />
        </Elements>
    );
};

export default StripePaymentElement;
