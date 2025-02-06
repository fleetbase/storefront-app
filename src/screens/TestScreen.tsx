import { YStack, Text } from 'tamagui';

const TestScreen = () => {
    return (
        <YStack flex={1} alignItems='center' justifyContent='center' bg='$background' width='100%' height='100%'>
            <Text color='$textPrimary' fontSize={20} fontWeight='bold'>
                Hello World
            </Text>
        </YStack>
    );
};

export default TestScreen;
