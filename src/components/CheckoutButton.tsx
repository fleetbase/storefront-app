import { Spinner, YStack, Button, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRocket, faUnlock } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';
import useCart from '../hooks/use-cart';

const CheckoutButton = ({ total = 0, onCheckout, onAuthRequired, disabled = false, isLoading = false, ...props }) => {
    const theme = useTheme();
    const { isAuthenticated } = useAuth();
    const [cart, updateCart] = useCart();

    return (
        <YStack width='100%'>
            {isAuthenticated ? (
                <Button onPress={onCheckout} size='$5' bg='$green-600' flex={1} opacity={disabled ? 0.75 : 1} disabled={disabled} {...props}>
                    <Button.Icon>{isLoading ? <Spinner color='$green-100' /> : <FontAwesomeIcon icon={faRocket} color={theme['green-100'].val} />}</Button.Icon>
                    <Button.Text color='$green-100' fontWeight='bold' fontSize='$5'>
                        Checkout {formatCurrency(total, cart.getAttribute('currency'))}
                    </Button.Text>
                </Button>
            ) : (
                <Button onPress={onAuthRequired} size='$5' bg='$blue-600' flex={1} disabled={true} {...props}>
                    <Button.Icon>
                        <FontAwesomeIcon icon={faUnlock} color={theme['blue-100'].val} />
                    </Button.Icon>
                    <Button.Text color='$blue-100' fontWeight='bold' fontSize='$5'>
                        Login or Create Account
                    </Button.Text>
                </Button>
            )}
        </YStack>
    );
};

export default CheckoutButton;
