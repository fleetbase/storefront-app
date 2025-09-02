import TabSwitch from './TabSwitch';
import { storefrontConfig } from '../utils';
import { useLanguage } from '../contexts/LanguageContext';

const CheckoutPickupSwitch = ({ onChange }) => {
    const { t } = useLanguage();

    const prioritizePickup = storefrontConfig('prioritizePickup');
    const receivingOptions = [
        { label: t('CheckoutPickupSwitch.delivery'), value: 'delivery' },
        { label: t('CheckoutPickupSwitch.pickup'), value: 'pickup' },
    ];

    if (prioritizePickup) {
        receivingOptions.reverse();
    }

    const handleTabChange = (value) => {
        const isPickup = value === 'pickup';
        if (typeof onChange === 'function') {
            onChange(isPickup);
        }
    };

    return <TabSwitch options={receivingOptions} onTabChange={handleTabChange} />;
};

export default CheckoutPickupSwitch;
