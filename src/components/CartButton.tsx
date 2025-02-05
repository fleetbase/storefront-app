import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faShoppingCart } from '@fortawesome/free-solid-svg-icons';
import { Button, YStack, Text, useTheme } from 'tamagui';
import useCart from '../hooks/use-cart';

const CartButton = ({ size = 30, onPress, ...props }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const [cart] = useCart();
    const count = cart ? cart.contents().length : 0;

    const handlePress = function () {
        if (typeof onPress === 'function') {
            onPress({ cart, navigation });
        }
    };

    return (
        <YStack position='relative'>
            <Button onPress={handlePress} justifyContent='center' alignItems='center' bg='transparent' size={size} {...props}>
                <Button.Icon>
                    <FontAwesomeIcon icon={faShoppingCart} color={theme.color.val} />
                </Button.Icon>
            </Button>
            {count > 0 && (
                <Button position='absolute' top={0} right={-3} bg='$red-400' alignItems='center' justifyContent='center' size={15} circular>
                    <Text fontSize={10} fontWeight='bold'>
                        {count}
                    </Text>
                </Button>
            )}
        </YStack>
    );
};

export default CartButton;
