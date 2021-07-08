import AsyncStorage from '@react-native-async-storage/async-storage';

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

    return AsyncStorage.setItem(key, value);
};

const get = async (key) => {
    let value = await AsyncStorage.getItem(key);

    if (isJson(value)) {
        value = JSON.parse(value);
    }

    return new Promise((resolve) => {
        if (!value) {
            resolve(null);
        }

        resolve(value);
    });
};

const remove = (key) => {
    return AsyncStorage.removeItem(key);
};

export { get, set, remove, isJson };
