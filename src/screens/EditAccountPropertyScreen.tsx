import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { Spinner, Text, YStack, XStack, Button, Input, useTheme } from 'tamagui';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { useAuth } from '../contexts/AuthContext';
import { usePromiseWithLoading } from '../hooks/use-promise-with-loading';
import PhoneInput from '../components/PhoneInput';

const RenderAccountProperty = ({ property, value, onChange }) => {
    if (property.component === 'input') {
        return (
            <Input
                value={value}
                onChangeText={onChange}
                size='$5'
                placeholder={property.name}
                color='$color'
                shadowOpacity={0}
                shadowRadius={0}
                borderWidth={1}
                borderColor='$borderColorWithShadow'
                borderRadius='$4'
                bg='white'
                flex={1}
                autoCapitalize={false}
                autoComplete={false}
                autoCorrect={false}
            />
        );
    } else if (property.component === 'phone-input') {
        return <PhoneInput value={value} onChange={onChange} wrapperProps={{ flex: 1, height: 200 }} />;
    }
};

const EditAccountPropertyScreen = ({ route }) => {
    const property = route.params.property;
    const theme = useTheme();
    const navigation = useNavigation();
    const { customer, setCustomer } = useAuth();
    const { runWithLoading, isLoading } = usePromiseWithLoading();
    const [value, setValue] = useState(customer.getAttribute(property.key));
    const mutated = value !== customer.getAttribute(property.key);

    const handleUpdateProperty = async () => {
        try {
            const updatedCustomer = await runWithLoading(customer.update({ [property.key]: value }));
            setCustomer(updatedCustomer);
            toast.success(`${property.name} changes saved.`);
            navigation.goBack();
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} bg='$background' space='$3' padding='$5'>
                <XStack paddingVertical='$3' justifyContent='space-between' mb='$1'>
                    <Text fontSize='$9' fontWeight='bold' color='$textPrimary' numberOfLines={1}>
                        {property.name}
                    </Text>
                </XStack>
                <XStack flex={1} width='100%'>
                    <RenderAccountProperty property={property} value={value} onChange={setValue} />
                </XStack>
                <XStack position='absolute' bottom={0} left={0} right={0} padding='$5'>
                    <Button onPress={handleUpdateProperty} size='$5' bg='$blue-500' flex={1} opacity={mutated ? 1 : 0.75} disabled={!mutated}>
                        <Button.Icon>{isLoading() && <Spinner color='$blur-800' />}</Button.Icon>
                        <Button.Text color='$blue-600' fontWeight='bold' fontSize='$5'>
                            Save
                        </Button.Text>
                    </Button>
                </XStack>
            </YStack>
        </SafeAreaView>
    );
};

export default EditAccountPropertyScreen;
