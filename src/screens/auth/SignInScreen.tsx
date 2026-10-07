import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { faApple, faFacebook, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack } from 'tamagui';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useOAuth from '../../hooks/use-oauth';
import { isValidPhoneNumber, storefrontConfig } from '../../utils';
import { setAuthRedirect } from '../../navigation/auth-redirect';
import PhoneField from '../../components/auth/PhoneField';
import { Button, IconButton, TextField, UIText, space } from '../../ui';

const PROVIDERS = [
    { key: 'apple', icon: faApple, variant: 'inverse' },
    { key: 'google', icon: faGoogle, variant: 'outline' },
    { key: 'facebook', icon: faFacebook, variant: 'outline' },
] as const;

/**
 * Phone-first sign in (and, with `mode: 'create'`, sign up with a name), plus the social
 * sign-ins the build enables. A `redirectTo` param (for example the checkout) is where the
 * customer lands once signed in.
 */
const SignInScreen = ({ route, mode: forcedMode }: any) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const { ownerInfo } = useStorefrontRuntime();
    const { login, requestCreationCode, requestPhoneVerification, phone: lastPhone } = useAuth() as any;
    const oauth = useOAuth();
    const params = route?.params ?? {};
    const mode: 'signIn' | 'create' | 'phone' = forcedMode ?? params.mode ?? 'signIn';
    const [phone, setPhone] = useState<string>(params.phone ?? lastPhone ?? '');
    const [name, setName] = useState<string>(params.name ?? '');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fromCheckout = params.redirectTo === 'checkout';

    // Remember where to go once signed in (e.g. back to checkout).
    useEffect(() => {
        if (params.redirect) setAuthRedirect(params.redirect);
    }, [params.redirect]);

    const sendCode = async () => {
        if (sending) return;
        if (mode === 'create' && !name.trim()) return setError(t('Auth.nameRequired'));
        if (!isValidPhoneNumber(phone)) return setError(t('Auth.invalidPhone'));
        setError(null);
        setSending(true);
        try {
            if (mode === 'phone') {
                await requestPhoneVerification(phone);
                navigation.navigate('VerifyPhone', { phone, returnTo: params.returnTo });
            } else if (mode === 'create') {
                await requestCreationCode(phone);
                navigation.navigate('CreateAccountVerify', { phone, name: name.trim() });
            } else {
                await login(phone);
                navigation.navigate('PhoneLoginVerify', { phone });
            }
        } catch (failure: any) {
            setError(failure?.message || t('Auth.sendFailed'));
        } finally {
            setSending(false);
        }
    };

    const social = async (provider: string) => {
        try {
            await oauth.login(provider);
        } catch {
            setError(t('Auth.socialFailed', { provider: provider[0].toUpperCase() + provider.slice(1) }));
        }
    };

    const providers = PROVIDERS.filter((provider) => oauth.loginSupported?.(provider.key));
    const terms = storefrontConfig('termsUrl');
    const privacy = storefrontConfig('privacyUrl');
    const appName = ownerInfo?.name ?? '';
    const title = mode === 'phone' ? t('Auth.addPhoneTitle') : mode === 'create' ? t('Auth.createTitle') : fromCheckout ? t('Auth.signInToOrder') : t('Auth.signInTitle');
    const subtitle = mode === 'phone' ? t('Auth.addPhoneBody') : fromCheckout ? t('Auth.cartSaved') : mode === 'create' ? t('Auth.createBody', { name: appName }) : t('Auth.signInBody');

    return (
        <YStack flex={1} backgroundColor='$background'>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, paddingHorizontal: space.gutter + 4, gap: 20 }}
                    keyboardShouldPersistTaps='handled'
                >
                    {navigation.canGoBack() && (
                        <XStack marginLeft={-10}>
                            <IconButton icon={faXmark} variant='plain' size={44} accessibilityLabel={t('UI.close')} onPress={() => navigation.goBack()} />
                        </XStack>
                    )}

                    <YStack gap={8}>
                        <UIText variant='display' style={{ fontSize: 28, lineHeight: 34 }} accessibilityRole='header'>
                            {title}
                        </UIText>
                        <UIText tone='secondary'>{subtitle}</UIText>
                    </YStack>

                    {mode === 'create' && (
                        <YStack gap={8}>
                            <UIText variant='captionStrong' style={{ fontSize: 14 }}>
                                {t('Auth.yourName')}
                            </UIText>
                            <TextField
                                value={name}
                                onChangeText={setName}
                                placeholder={t('Auth.namePlaceholder')}
                                accessibilityLabel={t('Auth.yourName')}
                                autoComplete='name'
                                textContentType='name'
                                height={54}
                            />
                        </YStack>
                    )}

                    <YStack gap={8}>
                        <UIText variant='captionStrong' style={{ fontSize: 14 }}>
                            {t('Auth.mobileNumber')}
                        </UIText>
                        <PhoneField value={phone} onChange={setPhone} onSubmit={sendCode} invalid={!!error} autoFocus={mode !== 'create'} />
                        {error ? (
                            <UIText variant='captionStrong' tone='error' accessibilityRole='alert'>
                                {error}
                            </UIText>
                        ) : (
                            <UIText variant='caption' tone='secondary'>
                                {t('Auth.smsNote')}
                            </UIText>
                        )}
                    </YStack>

                    <Button size='lg' fullWidth loading={sending} onPress={sendCode}>
                        {t('Auth.sendCode')}
                    </Button>

                    {mode === 'signIn' && providers.length > 0 && (
                        <>
                            <XStack alignItems='center' gap={12} accessibilityElementsHidden>
                                <YStack flex={1} height={1} backgroundColor='$borderColor' />
                                <UIText variant='captionStrong' tone='secondary'>
                                    {t('Auth.or')}
                                </UIText>
                                <YStack flex={1} height={1} backgroundColor='$borderColor' />
                            </XStack>
                            <YStack gap={10}>
                                {providers.map((provider) => (
                                    <Button
                                        key={provider.key}
                                        size='lg'
                                        fullWidth
                                        variant={provider.variant}
                                        icon={provider.icon as any}
                                        loading={oauth.loading}
                                        onPress={() => social(provider.key)}
                                    >
                                        {t(`Auth.continueWith.${provider.key}`)}
                                    </Button>
                                ))}
                            </YStack>
                        </>
                    )}

                    {mode !== 'phone' && (
                        <Button variant='ghost' fullWidth onPress={() => navigation.navigate(mode === 'create' ? 'Login' : 'CreateAccount', { redirectTo: params.redirectTo, phone })}>
                            {mode === 'create' ? t('Auth.haveAccount') : t('Auth.newHere')}
                        </Button>
                    )}

                    {mode !== 'phone' && (!!terms || !!privacy) && (
                        <UIText variant='caption' tone='secondary' textAlign='center' style={{ marginTop: 'auto' }}>
                            {t('Auth.agree', { name: appName })}{' '}
                            {!!terms && (
                                <UIText variant='caption' tone='brand' accessibilityRole='link' onPress={() => Linking.openURL(terms)} style={{ textDecorationLine: 'underline' }}>
                                    {t('Auth.terms')}
                                </UIText>
                            )}
                            {!!terms && !!privacy && ` ${t('Auth.and')} `}
                            {!!privacy && (
                                <UIText variant='caption' tone='brand' accessibilityRole='link' onPress={() => Linking.openURL(privacy)} style={{ textDecorationLine: 'underline' }}>
                                    {t('Auth.privacy')}
                                </UIText>
                            )}
                        </UIText>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </YStack>
    );
};

export default SignInScreen;
