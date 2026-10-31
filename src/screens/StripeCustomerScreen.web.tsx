import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { XStack, YStack, useTheme } from 'tamagui';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useBranding } from '../branding/BrandingProvider';
import useStorefront from '../hooks/use-storefront';
import CardBrandLogo from '../components/CardBrandLogo';
import { getStripe, stripeAppearance, stripeReturnUrl } from '../utils/stripe-web';
import { toast } from '../utils/toast';
import { Button, Sheet, Skeleton, UIText, radius } from '../ui';

type SavedCard = { brand?: string; label?: string; last4?: string } | null;

/** A new card for the customer's account: confirms the SetupIntent and makes it the saved card. */
const NewCardForm = ({ onSaved }: { onSaved: () => void }) => {
    const stripe = useStripe();
    const elements = useElements();
    const { t } = useLanguage();
    const { updateCustomerMeta } = useAuth();
    const [ready, setReady] = useState(false);
    const [complete, setComplete] = useState(false);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!stripe || !elements) return;
        setSaving(true);
        try {
            const { error, setupIntent } = await stripe.confirmSetup({ elements, confirmParams: { return_url: stripeReturnUrl('account') }, redirect: 'if_required' });
            if (error) {
                toast.error(error.message ?? t('StripePaymentElement.paymentFailed'));
                return;
            }
            const paymentMethod = typeof setupIntent?.payment_method === 'string' ? setupIntent.payment_method : setupIntent?.payment_method?.id;
            if (paymentMethod) await updateCustomerMeta({ stripe_payment_method_id: paymentMethod });
            toast.success(t('StripePaymentElement.cardSaved'));
            onSaved();
        } catch (error: any) {
            toast.error(error?.message ?? t('StripePaymentElement.paymentFailed'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <YStack gap={16}>
            {!ready && <Skeleton height={140} radius={radius.button} />}
            <div style={ready ? undefined : { height: 0, overflow: 'hidden' }}>
                <PaymentElement options={{ layout: 'tabs', paymentMethodOrder: ['card'], wallets: { applePay: 'never', googlePay: 'never' } }} onReady={() => setReady(true)} onChange={(event) => setComplete(event.complete)} />
            </div>
            <Button size='lg' fullWidth disabled={!complete} loading={saving} onPress={save}>
                {t('StripeCardFieldSheet.savePaymentMethod')}
            </Button>
        </YStack>
    );
};

/**
 * The customer's saved card on the web (the native app uses Stripe's CustomerSheet): shows
 * it and replaces it with a new one through a SetupIntent and the Payment Element.
 */
const StripeCustomerScreen = () => {
    const navigation = useNavigation<any>();
    const theme = useTheme();
    const { t } = useLanguage();
    const { scheme } = useBranding();
    const { customer } = useAuth();
    const { storefront } = useStorefront();
    const stripePromise = getStripe();
    const [setup, setSetup] = useState<{ clientSecret: string; defaultPaymentMethod: SavedCard } | null>(null);
    const [failed, setFailed] = useState(false);
    const appearance = useMemo(() => stripeAppearance(theme, scheme, radius.button), [theme, scheme]);

    useEffect(() => {
        if (!customer || !storefront || !stripePromise) return;
        let active = true;
        storefront.checkout
            .createStripeSetupIntent(customer)
            .then((response: any) => active && setSetup({ clientSecret: response.clientSecret, defaultPaymentMethod: response.defaultPaymentMethod ?? null }))
            .catch((error: any) => {
                console.warn('Could not load the saved card:', error);
                if (active) setFailed(true);
            });
        return () => {
            active = false;
        };
    }, [customer, storefront, stripePromise]);

    const close = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Profile'));
    const saved = setup?.defaultPaymentMethod;

    return (
        <Sheet open onClose={close} title={t('StripeCustomerScreen.manageYourPaymentMethod')}>
            <YStack gap={16} paddingBottom={8}>
                {saved && (
                    <XStack alignItems='center' gap={12}>
                        <CardBrandLogo brand={saved.brand} width={44} height={28} />
                        <UIText variant='bodyStrong'>{t('StripeCardFieldSheet.cardEndingIn', { label: saved.label ?? saved.last4 })}</UIText>
                    </XStack>
                )}
                {!stripePromise ? (
                    <UIText tone='error'>{t('StripePaymentElement.notConfigured')}</UIText>
                ) : failed ? (
                    <UIText tone='error'>{t('StripePaymentElement.loadFailed')}</UIText>
                ) : !setup ? (
                    <Skeleton height={140} radius={radius.button} />
                ) : (
                    <Elements stripe={stripePromise} options={{ clientSecret: setup.clientSecret, appearance, loader: 'never' }}>
                        <NewCardForm onSaved={close} />
                    </Elements>
                )}
            </YStack>
        </Sheet>
    );
};

export default StripeCustomerScreen;
