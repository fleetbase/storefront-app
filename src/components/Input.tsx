import { Input as GUIInput, YStack } from 'tamagui';
import useAppTheme from '../hooks/use-app-theme';

const Input = ({ size = '$5', color = '$textPrimary', borderColor = '$borderColorWithShadow', borderRadius = '$5', bg, ...props }) => {
    const { isDarkMode } = useAppTheme();
    const backgroundColor = bg ? bg : isDarkMode ? '$surface' : '$white';

    return (
        <YStack height={50}>
            <GUIInput
                size={size}
                color={color}
                borderColor={borderColor}
                borderRadius={borderRadius}
                bg={backgroundColor}
                borderWidth={1}
                flex={1}
                autoCapitalize={false}
                autoComplete={false}
                autoCorrect={false}
                shadowOpacity={0}
                shadowRadius={0}
                {...props}
            />
        </YStack>
    );
};

export default Input;
