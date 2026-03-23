import TabSwitch from './TabSwitch';
import { useLanguage } from '../contexts/LanguageContext';

const QPayTaxRegistrationSwitch = ({ isPersonal = true, onChange }) => {
    const { t } = useLanguage();
    const receivingOptions = [
        { label: t('QPayCheckoutScreen.personal'), value: 'personal' },
        { label: t('QPayCheckoutScreen.company'), value: 'company' },
    ];

    const handleTabChange = (value) => {
        const isPersonal = value === 'personal';
        if (typeof onChange === 'function') {
            onChange(isPersonal);
        }
    };

    return <TabSwitch options={receivingOptions} onTabChange={handleTabChange} initialIndex={isPersonal ? 0 : 1} />;
};

export default QPayTaxRegistrationSwitch;
