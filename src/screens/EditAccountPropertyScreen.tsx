import React, { useEffect, useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, Pressable, Keyboard, StyleSheet } from 'react-native';
import { Spinner, Text, YStack, XStack, Button, useTheme } from 'tamagui';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { useAuth } from '../contexts/AuthContext';
import { usePromiseWithLoading } from '../hooks/use-promise-with-loading';
import BackButton from '../components/BackButton';
import PhoneInput from '../components/PhoneInput';
import Input from '../components/Input';
import AbsoluteTabBarScreenWrapper from '../components/AbsoluteTabBarScreenWrapper';

const RenderAccountProperty = ({ property, value, onChange }) => {
    return (
        <YStack flex={1} width='100%'>
            {property.component === 'phone-input' ? <PhoneInput value={value} onChange={onChange} /> : <Input value={value} onChangeText={onChange} size='$5' placeholder={property.name} />}
        </YStack>
    );
};

const EditAccountPropertyScreen = ({ route }) => {
    const property = route.params.property;
    const theme = useTheme();
    const navigation = useNavigation();
    const { customer, setCustomer } = useAuth();
    const { runWithLoading, isLoading } = usePromiseWithLoading();
    const [value, setValue] = useState(customer.getAttribute(property.key));
    const mutated = value !== customer.getAttribute(property.key);

    const handleUpdateProperty = useCallback(async () => {
        if (!value) {
            return;
        }

        try {
            const updatedCustomer = await runWithLoading(customer.update({ [property.key]: value }));
            setCustomer(updatedCustomer);
            toast.success(`${property.name} changes saved.`);
            navigation.goBack();
        } catch (error) {
            toast.error(error.message);
        }
    }, [customer, runWithLoading, value]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <AbsoluteTabBarScreenWrapper>
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
                    <XStack position='absolute' bottom={0} left={0} right={0} px='$4'>
                        <Button onPress={handleUpdateProperty} size='$5' bg='$primary' flex={1} opacity={mutated ? 1 : 0.75} disabled={!mutated}>
                            <Button.Icon>{isLoading() && <Spinner color='$textPrimary' />}</Button.Icon>
                            <Button.Text color='$textPrimary' fontWeight='bold' fontSize='$5'>
                                Save
                            </Button.Text>
                        </Button>
                    </XStack>
                </YStack>
            </AbsoluteTabBarScreenWrapper>
        </SafeAreaView>
    );
};

export default EditAccountPropertyScreen;
