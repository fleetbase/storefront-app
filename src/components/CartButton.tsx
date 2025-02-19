import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faShoppingCart } from '@fortawesome/free-solid-svg-icons';
import { Button, YStack, XStack, Text, useTheme } from 'tamagui';
import { BlurView } from '@react-native-community/blur';
import useCart from '../hooks/use-cart';
import useAppTheme from '../hooks/use-app-theme';

const CartButton = ({ iconSize = 18, blur = false, style, text, onPress, children }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { isDarkMode } = useAppTheme();
    const [cart] = useCart();
    const count = cart ? cart.contents().length : 0;

    const handlePress = function () {
        if (typeof onPress === 'function') {
            onPress({ cart, navigation });
        }
    };

    return (
        <YStack position='relative'>
            <Pressable onPress={handlePress} style={[style, { alignItems: 'center', justifyContent: 'center', overflow: blur ? 'hidden' : 'auto' }]}>
                <XStack justifyContent='center' alignItems='center' bg='transparent' zIndex={2}>
                    {text && (
                        <YStack mr='$2'>
                            <Text color='$textPrimary'>{text}</Text>
                        </YStack>
                    )}
                    {children}
                    <FontAwesomeIcon icon={faShoppingCart} color={theme.color.val} iconSize={iconSize} />
                </XStack>
                {blur && (
                    <BlurView
                        style={StyleSheet.absoluteFillObject}
                        blurType={isDarkMode ? 'dark' : 'light'}
                        blurAmount={10}
                        borderRadius={20}
                        reducedTransparencyFallbackColor='rgba(255, 255, 255, 0.8)'
                    />
                )}
                {count > 0 && (
                    <Button zIndex={9} position='absolute' top={-8} right={-10} bg='$red-400' alignItems='center' justifyContent='center' size={15} circular>
                        <Text fontSize={10} fontWeight='bold'>
                            {count}
                        </Text>
                    </Button>
                )}
            </Pressable>
        </YStack>
    );
};

export default CartButton;
