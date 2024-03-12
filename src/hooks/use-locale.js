import { storage, useMMKVStorage } from 'utils/Storage';
import { setLanguage } from 'utils/Localize';

const useLocale = (defaultLocale = 'en') => {
    const [value, setValue] = useMMKVStorage('_locale', storage, defaultLocale);

    const setLocale = (locale) => {
        setLanguage(locale);
        setValue(locale);
    };

    return [value, setLocale];
};

export default useLocale;
