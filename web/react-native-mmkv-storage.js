import { useState } from 'react';

class MMKVStorage {
    setArray(key, array) {
        return this.setString(key, JSON.stringify(array));
    }

    getArray(key) {
        const value = this.getString(key);
        try {
            return JSON.parse(value) || [];
        } catch (e) {
            return [];
        }
    }

    setMap(key, map) {
        return this.setString(key, JSON.stringify(map));
    }

    getMap(key) {
        const value = this.getString(key);
        if (value === null) {
            return null;
        }
        try {
            return JSON.parse(value);
        } catch (e) {
            return null;
        }
    }

    setBool(key, bool) {
        return this.setString(key, JSON.stringify(bool));
    }

    getBool(key) {
        const value = this.getString(key);
        try {
            return JSON.parse(value);
        } catch (e) {
            return false;
        }
    }

    setInt(key, int) {
        return this.setString(key, int.toString());
    }

    getInt(key) {
        const value = this.getString(key);
        const num = parseInt(value, 10);
        return isNaN(num) ? 0 : num;
    }

    setString(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.error('Error saving key', key, error);
            throw error;
        }
    }

    getString(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.error('Error reading key', key, error);
            throw error;
        }
    }

    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing key', key, error);
            throw error;
        }
    }

    clearAll() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing storage', error);
            throw error;
        }
    }
}

class MMKVLoader {
    initialize() {
        return new MMKVStorage();
    }
}

// Updated useMMKVStorage accepts a storage instance as second parameter.
function useMMKVStorage(key, storage, defaultValue) {
    // Use the provided storage instance or fallback to a new instance.
    const mmkv = storage || new MMKVStorage();
    const initialValue = (() => {
        try {
            const stored = mmkv.getString(key);
            if (stored !== null) {
                try {
                    return JSON.parse(stored);
                } catch (e) {
                    return stored;
                }
            } else {
                return defaultValue;
            }
        } catch (error) {
            console.error('Error reading key', key, error);
            return defaultValue;
        }
    })();

    const [value, setValue] = useState(initialValue);

    function setStoredValue(newValue) {
        try {
            setValue(newValue);
            mmkv.setString(key, JSON.stringify(newValue));
        } catch (error) {
            console.error('Error saving key', key, error);
        }
    }

    return [value, setStoredValue];
}

export { MMKVLoader, MMKVStorage, useMMKVStorage };
export default { Loader: MMKVLoader };
