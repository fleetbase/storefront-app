import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack } from 'tamagui';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { takeAuthRedirect } from '../../navigation/auth-redirect';
import { toast } from '../../utils/toast';
import { Button, CodeInput, IconButton, UIText, space } from '../../ui';

export type VerifyPurpose = 'signIn' | 'create' | 'phone' | 'delete';

const RESEND_SECONDS = 30;

/** "+65 9123 4567" style grouping for showing where the code went. */
function display(phone: string | null | undefined): string {
    if (!phone) return '';
    const digits = phone.replace(/[^\d]/g, '');
    return `+${digits.slice(0, digits.length - 8)} ${digits.slice(-8, -4)} ${digits.slice(-4)}`.trim();
}

/**
 * Enter the 6-digit code sent by SMS, for signing in, creating an account, adding a phone
 * number or confirming account deletion. Submits when the last digit is entered, shows the
 * error inline, and offers a resend after 30 seconds.
 */
const VerifyCodeScreen = ({ route, purpose }: { route: any; purpose: VerifyPurpose }) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const auth: any = useAuth();
    const params = route?.params ?? {};
    const phone: string | null = params.phone ?? auth.phone ?? auth.customer?.getAttribute?.('phone') ?? null;
    const [code, setCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [wait, setWait] = useState(RESEND_SECONDS);
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);

    const startTimer = () => {
        setWait(RESEND_SECONDS);
        if (timer.current) clearInterval(timer.current);
        timer.current = setInterval(() => setWait((value) => (value <= 1 ? (clearInterval(timer.current!), 0) : value - 1)), 1000);
    };

    useEffect(() => {
        startTimer();
        return () => {
            if (timer.current) clearInterval(timer.current);
        };
    }, []);

    const verify = async (value = code) => {
        if (verifying || value.length < 6) return;
        setVerifying(true);
        setError(null);
        try {
            if (purpose === 'signIn') await auth.verifyCode(value);
            else if (purpose === 'create') await auth.verifyAccountCreation(phone, value, { name: params.name });
            else if (purpose === 'phone') await auth.verifyPhoneNumber(value);
            else await auth.verifyAccountDeletion(value);
            finish();
        } catch {
            setError(t('Auth.codeMismatch'));
            setCode('');
        } finally {
            setVerifying(false);
        }
    };

    const finish = () => {
        if (purpose === 'phone') {
            toast.success(t('Auth.phoneSaved'));
            navigation.navigate(params.returnTo ?? 'Profile');
            return;
        }
        if (purpose === 'delete') {
            toast.success(t('Auth.accountDeleted'));
            return;
        }
        // Signed in: the signed-out screens unmount; continue where the customer was going.
        const redirect = takeAuthRedirect();
        if (redirect) navigation.navigate(redirect.route, redirect.params);
    };

    const resend = async () => {
        if (wait > 0) return;
        try {
            if (purpose === 'signIn') await auth.login(phone);
            else if (purpose === 'create') await auth.requestCreationCode(phone);
            else if (purpose === 'phone') await auth.requestPhoneVerification(phone);
            else await auth.deleteAccount();
            startTimer();
            toast.success(t('Auth.codeResent'));
        } catch (failure: any) {
            toast.error(failure?.message || t('Auth.sendFailed'));
        }
    };

    const title = purpose === 'phone' ? t('Auth.verifyPhoneTitle') : purpose === 'delete' ? t('Auth.verifyDeleteTitle') : t('Auth.checkMessages');
    const cta = purpose === 'phone' ? t('Auth.verifyAndSave') : purpose === 'delete' ? t('Auth.deleteForGood') : t('Auth.verifyAndContinue');

    return (
        <YStack flex={1} backgroundColor='$background'>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, paddingHorizontal: space.gutter + 4, gap: 22 }}
                    keyboardShouldPersistTaps='handled'
                >
                    <XStack marginLeft={-10} alignItems='center' justifyContent='space-between'>
                        <IconButton icon={faChevronLeft} variant='plain' size={44} accessibilityLabel={t('UI.back')} onPress={() => navigation.goBack()} />
                        {(purpose === 'signIn' || purpose === 'create') && (
                            <UIText variant='captionStrong' tone='secondary'>
                                {t('Auth.stepTwo')}
                            </UIText>
                        )}
                    </XStack>

                    <YStack gap={8}>
                        <UIText variant='display' style={{ fontSize: 28, lineHeight: 34 }} accessibilityRole='header'>
                            {title}
                        </UIText>
                        <UIText tone='secondary'>
                            {t('Auth.codeSentTo')} <UIText variant='bodyStrong'>{display(phone)}</UIText>
                            {purpose !== 'delete' && (
                                <>
                                    {'. '}
                                    <UIText variant='bodyStrong' tone='brand' accessibilityRole='link' onPress={() => navigation.goBack()}>
                                        {t('Auth.changeNumber')}
                                    </UIText>
                                </>
                            )}
                        </UIText>
                        {purpose === 'delete' && (
                            <UIText variant='captionStrong' tone='error'>
                                {t('Auth.deleteWarning')}
                            </UIText>
                        )}
                    </YStack>

                    <YStack gap={10}>
                        <CodeInput
                            value={code}
                            onChange={(value) => {
                                setCode(value);
                                if (error) setError(null);
                            }}
                            onComplete={verify}
                            invalid={!!error}
                            label={t('Auth.codeLabel')}
                        />
                        {!!error && (
                            <UIText variant='captionStrong' tone='error' accessibilityRole='alert'>
                                {error}
                            </UIText>
                        )}
                    </YStack>

                    <Button size='lg' fullWidth variant={purpose === 'delete' ? 'destructive' : 'solid'} loading={verifying} disabled={code.length < 6} onPress={() => verify()}>
                        {cta}
                    </Button>

                    <XStack justifyContent='center'>
                        {wait > 0 ? (
                            <UIText tone='secondary' aria-live='polite'>
                                {t('Auth.didntGetIt')} <UIText variant='bodyStrong'>{t('Auth.resendIn', { seconds: `0:${String(wait).padStart(2, '0')}` })}</UIText>
                            </UIText>
                        ) : (
                            <Button variant='ghost' onPress={resend}>
                                {t('Auth.resend')}
                            </Button>
                        )}
                    </XStack>
                </ScrollView>
            </KeyboardAvoidingView>
        </YStack>
    );
};

export default VerifyCodeScreen;

export const SignInVerifyScreen = (props: any) => <VerifyCodeScreen {...props} purpose='signIn' />;
export const CreateAccountVerifyScreen = (props: any) => <VerifyCodeScreen {...props} purpose='create' />;
export const PhoneVerifyScreen = (props: any) => <VerifyCodeScreen {...props} purpose='phone' />;
export const DeleteAccountVerifyScreen = (props: any) => <VerifyCodeScreen {...props} purpose='delete' />;
