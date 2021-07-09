// import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';

const isJson = (string) => {
    try {
        JSON.parse(string);
    } catch (e) {
        return false;
    }

    return true;
};

const set = (key, value) => {
    if (typeof value === 'object') {
        value = JSON.stringify(value);
    }

    return MMKV.set(key, value);
};

const get = (key) => {
    let value = MMKV.getString(key);

    if (!value) {
        return null;
    }

    if (isJson(value)) {
        value = JSON.parse(value);
    }

    return value;
};

const remove = (key) => {
    return MMKV.delete(key);
};

export { get, set, remove, isJson };
