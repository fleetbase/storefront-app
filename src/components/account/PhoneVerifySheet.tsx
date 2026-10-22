import React, { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { isValidPhoneNumber } from '../../utils';
import PhoneField from '../auth/PhoneField';
import { toast } from '../../utils/toast';
import { Button, CodeInput, Sheet, UIText } from '../../ui';

type PhoneStep = 'number' | 'code';

const RESEND_SECONDS = 30;

export type PhoneVerifySheetProps = {
    open: boolean;
    onClose: () => void;
    /** Called once the number is verified and saved to the customer. */
    onVerified?: () => void;
};

/**
 * Adding or changing the customer's phone in two steps: the number, then the code texted to
 * it. Verifying saves the number to the customer's profile. Used by Edit profile and by
 * checkout, which needs a phone before an order can be placed.
 */
export default function PhoneVerifySheet({ open, onClose, onVerified }: PhoneVerifySheetProps) {
    const { t } = useLanguage();
    const { customer, requestPhoneVerification, verifyPhoneNumber } = useAuth() as any;
    const phone = (customer?.getAttribute?.('phone') ?? '') as string;
    const [step, setStep] = useState<PhoneStep>('number');
    const [newPhone, setNewPhone] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [wait, setWait] = useState(0);
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => () => timer.current && clearInterval(timer.current), []);

    // Each opening starts again from the number.
    useEffect(() => {
        if (!open) return;
        setNewPhone(phone || '');
        setCode('');
        setError(null);
        setStep('number');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const startTimer = () => {
        setWait(RESEND_SECONDS);
        if (timer.current) clearInterval(timer.current);
        timer.current = setInterval(() => setWait((value) => (value <= 1 ? (clearInterval(timer.current!), 0) : value - 1)), 1000);
    };

    const close = () => {
        if (timer.current) clearInterval(timer.current);
        onClose();
    };

    const sendCode = async () => {
        if (!isValidPhoneNumber(newPhone)) {
            setError(t('Auth.invalidPhone'));
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await requestPhoneVerification(newPhone);
            setCode('');
            setStep('code');
            startTimer();
        } catch (failure: any) {
            setError(failure?.message || t('Auth.sendFailed'));
        } finally {
            setBusy(false);
        }
    };

    const resend = async () => {
        if (wait > 0) return;
        try {
            await requestPhoneVerification(newPhone);
            startTimer();
            toast.success(t('Auth.codeResent'));
        } catch (failure: any) {
            toast.error(failure?.message || t('Auth.sendFailed'));
        }
    };

    const verify = async (value = code) => {
        if (busy || value.length < 6) return;
        setBusy(true);
        setError(null);
        try {
            await verifyPhoneNumber(value);
            toast.success(t('Auth.phoneSaved'));
            close();
            onVerified?.();
        } catch {
            setError(t('Auth.codeMismatch'));
            setCode('');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={close}
            title={step === 'code' ? t('EditProfile.codeTitle') : phone ? t('EditProfile.changePhoneTitle') : t('EditProfile.addPhoneTitle')}
            footer={
                step === 'code' ? (
                    <Button size='lg' fullWidth loading={busy} disabled={code.length < 6} onPress={() => verify()}>
                        {t('EditProfile.verify')}
                    </Button>
                ) : (
                    <Button size='lg' fullWidth loading={busy} disabled={!newPhone} onPress={sendCode}>
                        {t('EditProfile.sendCode')}
                    </Button>
                )
            }
        >
            <YStack gap={12}>
                <YStack gap={4}>
                    <UIText variant='captionStrong' tone='brand'>
                        {t('EditProfile.stepOf', { step: step === 'code' ? 2 : 1 })}
                    </UIText>
                    <UIText tone='secondary'>{step === 'code' ? t('EditProfile.codeBody', { phone: newPhone }) : t('EditProfile.phoneBody')}</UIText>
                </YStack>
                {step === 'code' ? (
                    <YStack gap={10}>
                        <CodeInput
                            value={code}
                            onChange={(next: string) => {
                                setCode(next);
                                if (error) setError(null);
                            }}
                            onComplete={verify}
                            invalid={!!error}
                            label={t('EditProfile.codeLabel')}
                        />
                        {!!error && (
                            <UIText variant='captionStrong' tone='error' accessibilityRole='alert'>
                                {error}
                            </UIText>
                        )}
                        <XStack justifyContent='space-between' alignItems='center'>
                            {wait > 0 ? (
                                <UIText variant='caption' tone='secondary'>
                                    {t('EditProfile.resendIn', { seconds: wait })}
                                </UIText>
                            ) : (
                                <Pressable onPress={resend} accessibilityRole='button' style={{ minHeight: 40, justifyContent: 'center' }}>
                                    <UIText variant='captionStrong' tone='brand'>
                                        {t('EditProfile.resend')}
                                    </UIText>
                                </Pressable>
                            )}
                            <Pressable
                                onPress={() => {
                                    setError(null);
                                    setStep('number');
                                }}
                                accessibilityRole='button'
                                style={{ minHeight: 40, justifyContent: 'center' }}
                            >
                                <UIText variant='captionStrong' tone='brand'>
                                    {t('EditProfile.changeNumber')}
                                </UIText>
                            </Pressable>
                        </XStack>
                    </YStack>
                ) : (
                    <YStack gap={6}>
                        <PhoneField value={newPhone} onChange={setNewPhone} onSubmit={sendCode} invalid={!!error} autoFocus />
                        {error ? (
                            <UIText variant='captionStrong' tone='error' accessibilityRole='alert'>
                                {error}
                            </UIText>
                        ) : (
                            <UIText variant='caption' tone='secondary'>
                                {t('EditProfile.smsNote')}
                            </UIText>
                        )}
                    </YStack>
                )}
            </YStack>
        </Sheet>
    );
}
