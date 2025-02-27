import { Spinner, YStack, Button, useTheme } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRocket, faUnlock } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import useCart from '../hooks/use-cart';

const CheckoutButton = ({ total = 0, onCheckout, onAuthRequired, disabled = false, isLoading = false }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { isAuthenticated } = useAuth();
    const { t } = useLanguage();
    const [cart, updateCart] = useCart();

    const handleAuthRequired = () => {
        if (typeof onAuthRequired === 'function') {
            onAuthRequired();
        } else {
            navigation.navigate('StoreProfileTab', { screen: 'Login' });
        }
    };

    return (
        <YStack width='100%'>
            {isAuthenticated ? (
                <Button onPress={onCheckout} size='$5' borderWidth={1} bg='$success' borderColor='$successBorder' flex={1} opacity={disabled ? 0.75 : 1} disabled={disabled}>
                    <Button.Icon>{isLoading ? <Spinner color='$successText' /> : <FontAwesomeIcon icon={faRocket} color={theme['$successText'].val} />}</Button.Icon>
                    <Button.Text color='$successText' fontWeight='bold' fontSize='$5'>
                        {t('CheckoutButton.checkout', { total: formatCurrency(total, cart.getAttribute('currency')) })}
                    </Button.Text>
                </Button>
            ) : (
                <Button onPress={handleAuthRequired} size='$5' borderWidth={1} bg='$primary' borderColor='$primaryBorder' flex={1}>
                    <Button.Icon>
                        <FontAwesomeIcon icon={faUnlock} color={theme['$primaryText'].val} />
                    </Button.Icon>
                    <Button.Text color='$primaryText' fontWeight='bold' fontSize='$5'>
                        {t('CheckoutButton.loginOrCreateAccount')}
                    </Button.Text>
                </Button>
            )}
        </YStack>
    );
};

export default CheckoutButton;
