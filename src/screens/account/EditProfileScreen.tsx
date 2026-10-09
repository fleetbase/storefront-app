import React, { useState } from 'react';
import { Image, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { showActionSheet } from '../../utils';
import { toast } from '../../utils/toast';
import { Button, IconButton, Sheet, TextField, UIText, initials, radius, space, usableImageUrl } from '../../ui';

type Field = 'name' | 'email';

/**
 * Editing the person behind the account: photo, name, email and phone. Language,
 * appearance, payment methods and sign out live on the Account page, so they are not
 * repeated here. Deleting the account starts here, confirmed with a code.
 */
const EditProfileScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t } = useLanguage();
    const { customer, updateCustomer, deleteAccount } = useAuth();
    const [editing, setEditing] = useState<Field | null>(null);
    const [draft, setDraft] = useState('');
    const [saving, setSaving] = useState(false);
    const [photoBusy, setPhotoBusy] = useState(false);
    const [deleteSheet, setDeleteSheet] = useState(false);
    const [requestingDelete, setRequestingDelete] = useState(false);

    const value = (key: string) => (customer?.getAttribute?.(key) ?? '') as string;
    const name = value('name');
    const email = value('email');
    const phone = value('phone');
    const photo = usableImageUrl(value('photo_url'));

    const startEdit = (field: Field) => {
        setDraft(value(field));
        setEditing(field);
    };

    const save = async () => {
        if (!editing) return;
        const next = draft.trim();
        if (!next || next === value(editing)) {
            setEditing(null);
            return;
        }
        setSaving(true);
        try {
            await updateCustomer({ [editing]: next });
            toast.success(t('EditProfile.saved'));
            setEditing(null);
        } catch (failure: any) {
            toast.error(failure?.message || t('EditProfile.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const updatePhoto = async (data: string | null) => {
        setPhotoBusy(true);
        try {
            await updateCustomer({ photo: data ?? 'REMOVE' });
            toast.success(data ? t('AccountScreen.photoChanged') : t('AccountScreen.photoRemoved'));
        } catch {
            toast.error(t('EditProfile.saveFailed'));
        } finally {
            setPhotoBusy(false);
        }
    };

    const pickPhoto = (fromCamera: boolean) => {
        const options = { mediaType: 'photo' as const, includeBase64: true, maxWidth: 1024, maxHeight: 1024, quality: 0.8 as const };
        const handle = (response: any) => {
            const base64 = response?.assets?.[0]?.base64;
            if (base64) updatePhoto(base64);
        };
        if (fromCamera) launchCamera(options, handle);
        else launchImageLibrary(options, handle);
    };

    const changePhoto = () =>
        showActionSheet({
            options: [t('AccountScreen.changeProfilePhotoOptions.takePhoto'), t('AccountScreen.changeProfilePhotoOptions.photoLibrary'), t('common.cancel')],
            cancelButtonIndex: 2,
            onSelect: (index: number) => {
                if (index === 0) pickPhoto(true);
                if (index === 1) pickPhoto(false);
            },
        });

    const requestDeletion = async () => {
        setRequestingDelete(true);
        try {
            await deleteAccount();
            setDeleteSheet(false);
            navigation.navigate('DeleteAccountVerify', { phone });
        } catch (failure: any) {
            toast.error(failure?.message || t('Auth.sendFailed'));
        } finally {
            setRequestingDelete(false);
        }
    };

    const row = (label: string, content: React.ReactNode, action: string, onPress: () => void, last = false) => (
        <Pressable
            onPress={onPress}
            accessibilityRole='button'
            accessibilityHint={action}
            style={({ pressed }) => ({
                minHeight: 64,
                paddingHorizontal: 14,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderBottomWidth: last ? 0 : 1,
                borderColor: theme.borderColor.val,
                backgroundColor: pressed ? theme.backgroundPress?.val : 'transparent',
            })}
        >
            <YStack flex={1} gap={2}>
                <UIText variant='captionStrong' tone='secondary'>
                    {label}
                </UIText>
                {content}
            </YStack>
            <UIText variant='captionStrong' tone='brand'>
                {action}
            </UIText>
        </Pressable>
    );

    return (
        <YStack flex={1} backgroundColor='$surface'>
            <XStack alignItems='center' gap={8} paddingHorizontal={8} paddingTop={insets.top + 4} paddingBottom={10}>
                <IconButton icon={faChevronLeft} variant='plain' size={44} accessibilityLabel={t('UI.back')} onPress={() => navigation.goBack()} />
                <UIText variant='heading' accessibilityRole='header'>
                    {t('EditProfile.title')}
                </UIText>
            </XStack>

            <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: insets.bottom + 40, gap: 16 }}>
                <YStack alignItems='center' gap={10} paddingVertical={6}>
                    {photo ? (
                        <Image source={{ uri: photo }} style={{ width: 96, height: 96, borderRadius: 48 }} accessibilityLabel={t('EditProfile.photo')} />
                    ) : (
                        <YStack width={96} height={96} borderRadius={48} backgroundColor='$primarySoft' alignItems='center' justifyContent='center' accessibilityElementsHidden>
                            <UIText variant='title' tone='brand'>
                                {initials(name || email || '?')}
                            </UIText>
                        </YStack>
                    )}
                    <XStack gap={8}>
                        <Button variant='outline' size='sm' loading={photoBusy} onPress={changePhoto}>
                            {t('EditProfile.changePhoto')}
                        </Button>
                        {!!photo && (
                            <Button variant='ghost' size='sm' disabled={photoBusy} onPress={() => updatePhoto(null)}>
                                {t('EditProfile.removePhoto')}
                            </Button>
                        )}
                    </XStack>
                </YStack>

                <YStack backgroundColor='$background' borderRadius={radius.card} overflow='hidden' accessibilityLabel={t('EditProfile.details')}>
                    {row(t('EditProfile.name'), <UIText variant='bodyStrong'>{name || t('EditProfile.notSet')}</UIText>, t('EditProfile.edit'), () => startEdit('name'))}
                    {row(t('EditProfile.email'), <UIText variant='bodyStrong'>{email || t('EditProfile.notSet')}</UIText>, t('EditProfile.edit'), () => startEdit('email'))}
                    {row(
                        t('EditProfile.phone'),
                        phone ? (
                            <XStack alignItems='center' gap={6}>
                                <UIText variant='bodyStrong'>{phone}</UIText>
                                <FontAwesomeIcon icon={faCircleCheck} size={13} color={theme.successForeground?.val ?? theme.success.val} />
                            </XStack>
                        ) : (
                            <UIText tone='secondary'>{t('EditProfile.phoneMissing')}</UIText>
                        ),
                        phone ? t('EditProfile.change') : t('EditProfile.add'),
                        () => navigation.navigate('AddPhone', { returnTo: 'Account' }),
                        true
                    )}
                </YStack>

                <UIText variant='caption' tone='secondary'>
                    {t('EditProfile.elsewhere')}
                </UIText>

                <YStack marginTop={12} padding={14} gap={6} borderRadius={radius.card} backgroundColor='$background'>
                    <Pressable onPress={() => setDeleteSheet(true)} accessibilityRole='button' style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
                        <UIText variant='bodyStrong' tone='error'>
                            {t('EditProfile.deleteAccount')}
                        </UIText>
                    </Pressable>
                    <UIText variant='caption' tone='secondary'>
                        {t('EditProfile.deleteHint')}
                    </UIText>
                </YStack>
            </ScrollView>

            <Sheet
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={editing === 'email' ? t('EditProfile.emailTitle') : t('EditProfile.nameTitle')}
                footer={
                    <Button size='lg' fullWidth loading={saving} disabled={!draft.trim()} onPress={save}>
                        {t('EditProfile.save')}
                    </Button>
                }
            >
                <YStack gap={6}>
                    <UIText variant='captionStrong'>{editing === 'email' ? t('EditProfile.email') : t('EditProfile.fullName')}</UIText>
                    <TextField
                        value={draft}
                        onChangeText={setDraft}
                        autoFocus
                        autoCapitalize={editing === 'email' ? 'none' : 'words'}
                        autoComplete={editing === 'email' ? 'email' : 'name'}
                        keyboardType={editing === 'email' ? 'email-address' : 'default'}
                        accessibilityLabel={editing === 'email' ? t('EditProfile.email') : t('EditProfile.fullName')}
                        returnKeyType='done'
                        onSubmitEditing={save}
                    />
                </YStack>
            </Sheet>

            <Sheet
                open={deleteSheet}
                onClose={() => setDeleteSheet(false)}
                title={t('EditProfile.deleteTitle')}
                footer={
                    <YStack gap={8}>
                        <Button size='lg' fullWidth variant='destructive' loading={requestingDelete} onPress={requestDeletion}>
                            {t('EditProfile.sendDeleteCode')}
                        </Button>
                        <Button size='lg' fullWidth variant='outline' onPress={() => setDeleteSheet(false)}>
                            {t('EditProfile.keepAccount')}
                        </Button>
                    </YStack>
                }
            >
                <YStack gap={10}>
                    <UIText tone='secondary'>{t('EditProfile.deleteBody', { email: email || phone })}</UIText>
                    <YStack gap={6} padding={12} borderRadius={radius.card} backgroundColor='$errorSoft'>
                        {[t('EditProfile.deletePoint1'), t('EditProfile.deletePoint2'), t('EditProfile.deletePoint3')].map((point) => (
                            <XStack key={point} gap={8}>
                                <UIText>•</UIText>
                                <UIText flex={1}>{point}</UIText>
                            </XStack>
                        ))}
                    </YStack>
                </YStack>
            </Sheet>
        </YStack>
    );
};

export default EditProfileScreen;
