import { YStack, Text, Button } from 'tamagui';
import { SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { randomElement } from '../utils';
import { capitalize } from '../utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const backgroundColorOptions = ['white', 'blue', 'red', 'green', 'yellow', 'orange', 'brown', 'pink', 'black'];
const TestScreen = ({ route }) => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const params = route.params || {};
    const backgroundColor = params.backgroundColor ?? 'white';
    const text = params.text ?? 'Hello World';
    const count = params.count ?? 0;
    const isModal = params.modal ?? false;
    const screen = params.navigateTo ?? 'Test';
    const navigationParams = params.navigationParams ?? { count: (count ?? 0) + 1 };

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
                <Button onPress={handleTest} bg='$info' borderColor='$infoBorder' borderWidth={1} width='100%' rounded>
                    <Button.Text color='$infoText'>Continue</Button.Text>
                </Button>
                <Button onPress={handleOpenModal} bg='$success' borderColor='$successBorder' borderWidth={1} width='100%' rounded>
                    <Button.Text color='$successText'>Open Modal</Button.Text>
                </Button>
                <Button onPress={handleBack} bg='$warning' borderColor='$warningBorder' borderWidth={1} width='100%' rounded>
                    <Button.Text color='$warningText'>Go Back</Button.Text>
                </Button>
            </YStack>
        </SafeAreaView>
    );
};

export default TestScreen;
