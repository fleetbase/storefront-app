import React, { useEffect, useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Platform, Pressable, Keyboard, StyleSheet } from 'react-native';
import { Spinner, Text, YStack, XStack, Button, useTheme } from 'tamagui';
import { useAuth } from '../contexts/AuthContext';
import { usePromiseWithLoading } from '../hooks/use-promise-with-loading';
import { useSafeTabBarHeight as useBottomTabBarHeight } from '../hooks/use-safe-tab-bar-height';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from '../utils/toast';
import { useLanguage } from '../contexts/LanguageContext';
import BackButton from '../components/BackButton';
import PhoneInput from '../components/PhoneInput';
import Input from '../components/Input';
import AbsoluteTabBarScreenWrapper from '../components/AbsoluteTabBarScreenWrapper';
import ScreenWrapper from '../components/ScreenWrapper';

const RenderAccountProperty = ({ property, value, onChange }) => {
    return (
        <YStack flex={1} width='100%'>
            {property.component === 'phone-input' ? (
                <PhoneInput value={value} onChange={onChange} />
            ) : (
                <Input value={value} onChangeText={onChange} size='$5' placeholder={property.name} placeholderTextColor='$textSecondary' color='$textPrimary' />
            )}
        </YStack>
    );
};

const EditAccountPropertyScreen = ({ route }) => {
    const property = route.params.property;
    const theme = useTheme();
    const navigation = useNavigation();
    const tabBarHeight = useBottomTabBarHeight();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const { customer, setCustomer, updateCustomerMeta } = useAuth();
    const { runWithLoading, isLoading } = usePromiseWithLoading();
    const [value, setValue] = useState(customer.getAttribute(property.key));
    const mutated = value !== customer.getAttribute(property.key);

    const handleUpdateProperty = useCallback(async () => {
        if (!value) {
            return;
        }

        // If it's a meta property
        if (typeof property.key === 'string' && property.key.startsWith('meta.')) {
            try {
                const metaKey = property.key.slice('meta.'.length);
                await runWithLoading(updateCustomerMeta({ [metaKey]: value }));
                toast.success(t('EditAccountPropertyScreen.changesSaved', { propertyName: property.name }));
                navigation.goBack();
            } catch (error) {
                toast.error(error.message);
            }
        } else {
            try {
                const updatedCustomer = await runWithLoading(customer.update({ [property.key]: value }));
                setCustomer(updatedCustomer);
                toast.success(t('EditAccountPropertyScreen.changesSaved', { propertyName: property.name }));
                navigation.goBack();
            } catch (error) {
                toast.error(error.message);
            }
        }
    }, [customer, runWithLoading, value]);

    return (
        <ScreenWrapper>
            <YStack flex={1} bg='$background' space='$3' padding='$5'>
                <XStack space='$3' alignItems='center' mb='$5'>
                    <BackButton size={40} />
                    <Text color='$textPrimary' fontWeight='bold' fontSize='$8' numberOfLines={1}>
                        {property.name}
                    </Text>
                </XStack>
                <XStack width='100%'>
                    <RenderAccountProperty property={property} value={value} onChange={setValue} />
                </XStack>
                <YStack flex={1} position='relative' width='100%'>
                    <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} pointerEvents='box-only' />
                </YStack>
                <XStack position='absolute' bottom={Platform.select({ ios: tabBarHeight, android: insets.bottom + 15 })} left={0} right={0} px='$4'>
                    <Button onPress={handleUpdateProperty} size='$5' bg='$primary' flex={1} opacity={mutated ? 1 : 0.75} disabled={!mutated}>
                        <Button.Icon>{isLoading() && <Spinner color='$textPrimary' />}</Button.Icon>
                        <Button.Text color='$textPrimary' fontWeight='bold' fontSize='$5'>
                            {t('common.save')}
                        </Button.Text>
                    </Button>
                </XStack>
            </YStack>
        </ScreenWrapper>
    );
};

export default EditAccountPropertyScreen;
