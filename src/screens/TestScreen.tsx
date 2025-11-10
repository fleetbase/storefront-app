import React, { useCallback, useState } from 'react';
import { YStack, Text, Button } from 'tamagui';
import { SafeAreaView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { randomElement } from '../utils';
import { capitalize } from '../utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStorefront from '../hooks/use-storefront';
import axios from 'axios';

const backgroundColorOptions = ['white', 'blue', 'red', 'green', 'yellow', 'orange', 'brown', 'pink', 'black'];
const TestScreen = ({ route }) => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const { storefront } = useStorefront();
    const params = route.params || {};
    const backgroundColor = params.backgroundColor ?? 'white';
    const text = params.text ?? 'Hello World';
    const count = params.count ?? 0;
    const isModal = params.modal ?? false;
    const screen = params.navigateTo ?? 'Test';
    const navigationParams = params.navigationParams ?? { count: (count ?? 0) + 1 };

    // -- request state
    const [loading, setLoading] = useState(false);
    const [source, setSource] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const setOutcome = (label, data, err = null) => {
        setSource(label);
        setResult(data ?? null);
        setError(err ? err.message || String(err) : null);
    };

    const testRequest = useCallback(async () => {
        setLoading(true);
        setOutcome('https://httpbin.org/get', null, null);
        try {
            const response = await axios.get('https://httpbin.org/get', {
                params: { message: 'Hello World!' },
            });
            setOutcome('https://httpbin.org/get', response?.data);
        } catch (e) {
            setOutcome('https://httpbin.org/get', null, e);
        } finally {
            setLoading(false);
        }
    }, []);

    const testFleetbaseRequest = useCallback(async () => {
        setLoading(true);
        setOutcome('https://fleetbase.loclx.io', null, null);
        try {
            const response = await axios.get('https://fleetbase.loclx.io');
            setOutcome('https://fleetbase.loclx.io', response?.data);
        } catch (e) {
            setOutcome('https://fleetbase.loclx.io', null, e);
        } finally {
            setLoading(false);
        }
    }, []);

    const testStorefrontRequest = useCallback(async () => {
        setLoading(true);
        setOutcome('storefront.about()', null, null);
        try {
            const response = await storefront.about();
            const data = response?.data ?? response;
            setOutcome('storefront.about()', data);
        } catch (e) {
            setOutcome('storefront.about()', null, e);
        } finally {
            setLoading(false);
        }
    }, [storefront]);

    const handleTest = () => {
        let randomColor = randomElement(backgroundColorOptions);
        while (randomColor === backgroundColor) {
            randomColor = randomElement(backgroundColorOptions);
        }
        const colorScreen = `${capitalize(randomColor)}Test`;
        navigation.navigate(colorScreen, { ...navigationParams, backgroundColor: randomColor });
    };

    const handleBack = () => {
        if (count === 0) return;
        navigation.goBack();
    };

    const handleOpenModal = () => {
        let randomColor = randomElement(backgroundColorOptions);
        while (randomColor === backgroundColor) {
            randomColor = randomElement(backgroundColorOptions);
        }
        const colorScreen = `${capitalize(randomColor)}Test`;
        navigation.navigate('ModalTest', { ...navigationParams, backgroundColor: randomColor, modal: true });
    };

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <YStack flex={1} alignItems='center' justifyContent='center' bg={backgroundColor} width='100%' height='100%' gap='$4' padding='$6'>
                <YStack alignItems='center' justifyContent='center'>
                    <Text color='$textPrimary' fontSize={20} fontWeight='bold'>
                        {text}: {count}
                    </Text>
                    {isModal && (
                        <Text color={backgroundColor === 'black' ? 'yellow' : 'black'} fontSize={20} fontWeight='bold'>
                            MODAL SCREEN
                        </Text>
                    )}
                </YStack>

                <Button onPress={testRequest} bg='$yellow-100' borderColor='$yellow-800' borderWidth={1} width='100%' rounded='true' disabled={loading}>
                    <Button.Text color='$yellow-800'>{loading && source === 'https://httpbin.org/get' ? 'Testing…' : 'Test Request'}</Button.Text>
                </Button>

                <Button onPress={testFleetbaseRequest} bg='$blue-100' borderColor='$blue-800' borderWidth={1} width='100%' rounded='true' disabled={loading}>
                    <Button.Text color='$blue-800'>{loading && source === 'testFleetbaseRequest' ? 'Testing…' : 'Test Fleetbase Request'}</Button.Text>
                </Button>

                <Button onPress={testStorefrontRequest} bg='$purple-100' borderColor='$purple-800' borderWidth={1} width='100%' rounded='true' disabled={loading}>
                    <Button.Text color='$purple-800'>{loading && source === 'storefront.about()' ? 'Testing…' : 'Test Storefront Request'}</Button.Text>
                </Button>

                <Button onPress={handleTest} bg='$info' borderColor='$infoBorder' borderWidth={1} width='100%' rounded='true'>
                    <Button.Text color='$infoText'>Continue</Button.Text>
                </Button>

                <Button onPress={handleOpenModal} bg='$success' borderColor='$successBorder' borderWidth={1} width='100%' rounded='true'>
                    <Button.Text color='$successText'>Open Modal</Button.Text>
                </Button>

                <Button onPress={handleBack} bg='$warning' borderColor='$warningBorder' borderWidth={1} width='100%' rounded='true'>
                    <Button.Text color='$warningText'>Go Back</Button.Text>
                </Button>

                <YStack width='100%' maxWidth={900} borderWidth={1} borderColor='$borderColor' bg='$background' p='$3' br='$4' mt='$2' height={240}>
                    <Text fontWeight='600' mb='$2'>
                        {source ? `Response from ${source}` : 'No response yet'}
                    </Text>
                    <ScrollView style={{ flex: 1 }}>
                        {loading ? (
                            <Text>Loading…</Text>
                        ) : error ? (
                            <Text color='$red10' selectable>
                                {String(error)}
                            </Text>
                        ) : result ? (
                            <Text selectable style={{ fontFamily: 'Menlo', fontSize: 12 }}>
                                {JSON.stringify(result, null, 2)}
                            </Text>
                        ) : (
                            <Text color='$gray10'>Press a button above to send a test request.</Text>
                        )}
                    </ScrollView>
                </YStack>
            </YStack>
        </SafeAreaView>
    );
};

export default TestScreen;
