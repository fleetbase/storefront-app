import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { restoreFleetbasePlace } from '../utils/location';
import { toast } from '../utils/toast';
import { PLACE_TYPES, placeAttributes, placeFields, placeLines, validatePlace, type PlaceFields } from '../commerce/places';
import { finishPlaceFlow } from '../navigation/place-flow';
import useCurrentLocation from '../hooks/use-current-location';
import useSavedLocations from '../hooks/use-saved-locations';
import PlaceMapView from '../components/PlaceMapView';
import PhoneInput from '../components/PhoneInput';
import { Button, Card, Chip, IconButton, TextField, UIText, elevation, space } from '../ui';

/** Ask before deleting; the browser has no native alert with buttons. */
function confirmDelete(title: string, body: string, labels: { cancel: string; delete: string }): Promise<boolean> {
    if (Platform.OS === 'web') {
        const browserConfirm = (globalThis as any).window?.confirm;
        return Promise.resolve(typeof browserConfirm === 'function' ? Boolean(browserConfirm.call((globalThis as any).window, `${title}\n\n${body}`)) : false);
    }
    return new Promise((resolve) => {
        Alert.alert(title, body, [
            { text: labels.cancel, style: 'cancel', onPress: () => resolve(false) },
            { text: labels.delete, style: 'destructive', onPress: () => resolve(true) },
        ]);
    });
}

/**
 * The details of an address: where the pin is (with a way to move it), what kind of
 * place it is, its label, street and optional extras, notes for the courier, and
 * whether it is the default. Saving or deleting returns to whatever opened the flow.
 */
const EditLocationScreen = ({ route }) => {
    const params = route.params || {};
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const { isAuthenticated } = useAuth();
    const { currentLocation, updateDefaultLocationPromise } = useCurrentLocation();
    const { savedLocations, addLocation, deleteLocation } = useSavedLocations();
    // The place as it was opened; a moved pin arrives separately as `location`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const original = useMemo(() => params.place ?? {}, []);
    const isSaved = !!original.id;
    const isDefault = isSaved && currentLocation?.id === original.id;
    const [fields, setFields] = useState<PlaceFields>(() => {
        const initial = placeFields(original);
        // A new address's name is the map's name for the spot, not the customer's label.
        return isSaved ? initial : { ...initial, name: '' };
    });
    const [location, setLocation] = useState(original.location);
    const [makeDefault, setMakeDefault] = useState<boolean>(isDefault || !!params.makeDefault || !savedLocations?.length);
    const [showErrors, setShowErrors] = useState(false);
    const [busy, setBusy] = useState<'saving' | 'deleting' | null>(null);
    const errors = validatePlace(fields);

    // Coming back from "Adjust pin" brings the moved pin.
    useEffect(() => {
        if (params.place?.location) setLocation(params.place.location);
    }, [params.place?.location]);

    const preview = useMemo(() => ({ ...original, location }), [original, location]);
    const summary = placeLines(restoreFleetbasePlace({ ...preview, ...placeAttributes(fields) }));
    const set = (key: keyof PlaceFields) => (value: string) => setFields((current) => ({ ...current, [key]: value }));

    const adjustPin = () => navigation.navigate('LocationPicker', { place: { ...preview, ...placeAttributes(fields) }, adjust: true, makeDefault: params.makeDefault });

    const save = async () => {
        if (Object.keys(errors).length) {
            setShowErrors(true);
            return;
        }
        setBusy('saving');
        try {
            const attributes = placeAttributes(fields);
            const saved = await addLocation({ ...original, ...attributes, location, meta: { ...(original.meta ?? {}), ...attributes.meta } }, makeDefault);
            if (isAuthenticated && !saved) throw new Error('not saved');
            toast.success(t('Places.saved'));
            finishPlaceFlow(navigation);
        } catch {
            toast.error(t('Places.saveFailed'));
        } finally {
            setBusy(null);
        }
    };

    const remove = async () => {
        const name = summary.title;
        const confirmed = await confirmDelete(t('Places.deleteTitle', { name }), t('Places.deleteBody'), { cancel: t('Places.cancel'), delete: t('Places.delete') });
        if (!confirmed) return;
        setBusy('deleting');
        try {
            const place = restoreFleetbasePlace(original);
            await deleteLocation(place);
            // Deliveries went to this address; move them to the next saved one.
            const next = Array.from(savedLocations || []).find((candidate: any) => candidate.id !== original.id);
            if (isDefault && next) await updateDefaultLocationPromise(next);
            toast.success(t('Places.deleted', { name }));
            finishPlaceFlow(navigation);
        } catch {
            toast.error(t('Places.deleteFailed'));
        } finally {
            setBusy(null);
        }
    };

    const optional = (label: string) => `${label} · ${t('Places.optional')}`;

    return (
        <YStack flex={1} backgroundColor='$surface'>
            <XStack alignItems='center' gap={8} paddingHorizontal={8} paddingTop={insets.top + 4} paddingBottom={12}>
                <IconButton icon={faChevronLeft} variant='plain' size={44} accessibilityLabel={t('UI.back')} onPress={() => navigation.goBack()} />
                <UIText variant='heading' accessibilityRole='header'>
                    {isSaved ? t('Places.editTitle') : t('Places.detailsTitle')}
                </UIText>
            </XStack>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 24, gap: 12 }}
                keyboardShouldPersistTaps='handled'
                keyboardDismissMode='interactive'
                automaticallyAdjustKeyboardInsets
            >
                <Card style={elevation.card}>
                    {/* Decorative: "Adjust pin" below is the accessible way to move it. */}
                    <YStack accessibilityElementsHidden importantForAccessibility='no-hide-descendants'>
                        <PlaceMapView
                            place={preview}
                            height={128}
                            borderRadius='$0'
                            zoom={1}
                            onPress={adjustPin}
                            mapViewProps={{ scrollEnabled: false, zoomEnabled: false, rotateEnabled: false, pitchEnabled: false }}
                        />
                    </YStack>
                    <XStack alignItems='center' gap={12} paddingHorizontal={14} paddingVertical={12}>
                        <YStack flex={1} gap={2}>
                            <UIText variant='bodyStrong' numberOfLines={1}>
                                {fields.street1 || summary.title}
                            </UIText>
                            <UIText variant='caption' tone='secondary' numberOfLines={1}>
                                {[fields.neighborhood, fields.city, fields.postalCode].filter(Boolean).join(', ')}
                            </UIText>
                        </YStack>
                        <Button variant='ghost' size='sm' onPress={adjustPin}>
                            {t('Places.adjustPin')}
                        </Button>
                    </XStack>
                </Card>

                <Card padding={14} gap={10} style={elevation.card}>
                    <UIText variant='subheading' accessibilityRole='header'>
                        {t('Places.typeTitle')}
                    </UIText>
                    <XStack flexWrap='wrap' gap={8} accessibilityRole='radiogroup'>
                        {PLACE_TYPES.map((type) => (
                            <Chip key={type} label={t(`Places.types.${type}`)} selected={fields.type === type} onPress={() => setFields((current) => ({ ...current, type }))} />
                        ))}
                    </XStack>
                </Card>

                <Card padding={14} gap={14} style={elevation.card}>
                    <Field label={t('Places.label')}>
                        <TextField value={fields.name} onChangeText={set('name')} placeholder={t('Places.labelPlaceholder')} accessibilityLabel={t('Places.label')} />
                    </Field>
                    <Field label={t('Places.street')} error={showErrors && errors.street1 ? t('Places.streetRequired') : undefined}>
                        <TextField
                            value={fields.street1}
                            onChangeText={set('street1')}
                            placeholder={t('Places.streetPlaceholder')}
                            accessibilityLabel={t('Places.street')}
                            invalid={showErrors && !!errors.street1}
                        />
                    </Field>
                    <XStack gap={10}>
                        <Field label={t('Places.unit')} flex>
                            <TextField value={fields.street2} onChangeText={set('street2')} placeholder={t('Places.optional')} accessibilityLabel={optional(t('Places.unit'))} />
                        </Field>
                        <Field label={t('Places.postalCode')} flex>
                            <TextField value={fields.postalCode} onChangeText={set('postalCode')} placeholder={t('Places.optional')} accessibilityLabel={optional(t('Places.postalCode'))} />
                        </Field>
                    </XStack>
                    <XStack gap={10}>
                        <Field label={t('Places.neighborhood')} flex>
                            <TextField
                                value={fields.neighborhood}
                                onChangeText={set('neighborhood')}
                                placeholder={t('Places.optional')}
                                accessibilityLabel={optional(t('Places.neighborhood'))}
                            />
                        </Field>
                        <Field label={t('Places.city')} flex>
                            <TextField value={fields.city} onChangeText={set('city')} placeholder={t('Places.optional')} accessibilityLabel={optional(t('Places.city'))} />
                        </Field>
                    </XStack>
                    <Field label={optional(t('Places.phone'))}>
                        <PhoneInput
                            value={fields.phone}
                            onChange={(value: string) => setFields((current) => (current.phone === value ? current : { ...current, phone: value }))}
                            bg='$background'
                        />
                    </Field>
                    <Field label={optional(t('Places.instructions'))}>
                        <TextField
                            value={fields.instructions}
                            onChangeText={set('instructions')}
                            placeholder={t('Places.instructionsPlaceholder')}
                            accessibilityLabel={t('Places.instructions')}
                            multiline
                            height={88}
                            textAlignVertical='top'
                        />
                    </Field>
                </Card>

                <Card style={elevation.card}>
                    <Pressable
                        onPress={() => setMakeDefault((value) => !value)}
                        accessibilityRole='switch'
                        accessibilityState={{ checked: makeDefault }}
                        style={{ minHeight: 60, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    >
                        <YStack flex={1} gap={2} paddingVertical={10}>
                            <UIText variant='bodyStrong'>{t('Places.makeDefault')}</UIText>
                            <UIText variant='caption' tone='secondary'>
                                {t('Places.makeDefaultBody')}
                            </UIText>
                        </YStack>
                        <YStack width={52} height={32} borderRadius={16} backgroundColor={makeDefault ? '$primary' : '$borderColorWithShadow'} justifyContent='center'>
                            <YStack width={26} height={26} borderRadius={13} backgroundColor='#ffffff' marginLeft={makeDefault ? 23 : 3} style={elevation.card} />
                        </YStack>
                    </Pressable>
                </Card>

                {isSaved && isAuthenticated && (
                    <Button variant='ghost' onPress={remove} loading={busy === 'deleting'} disabled={busy !== null}>
                        <UIText variant='bodyStrong' tone='error'>
                            {t('Places.deleteAddress')}
                        </UIText>
                    </Button>
                )}
            </ScrollView>

            <YStack paddingHorizontal={space.gutter} paddingTop={12} paddingBottom={insets.bottom + 12} backgroundColor='$background' borderTopWidth={1} borderColor='$borderColor'>
                <Button fullWidth size='lg' onPress={save} loading={busy === 'saving'} disabled={busy !== null}>
                    {t('Places.save')}
                </Button>
            </YStack>
        </YStack>
    );
};

/** A labelled form field with an optional error under it. */
function Field({ label, error, flex = false, children }: { label: string; error?: string; flex?: boolean; children: React.ReactNode }) {
    return (
        <YStack gap={6} flex={flex ? 1 : undefined} minWidth={0}>
            <UIText variant='captionStrong' style={{ fontSize: 14 }} numberOfLines={1}>
                {label}
            </UIText>
            {children}
            {error ? (
                <UIText variant='captionStrong' tone='error' accessibilityRole='alert'>
                    {error}
                </UIText>
            ) : null}
        </YStack>
    );
}

export default EditLocationScreen;
