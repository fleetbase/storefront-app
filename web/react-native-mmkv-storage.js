/* global localStorage */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

    // Native MMKV exposes `clearStore`; keep the web shim API-compatible.
    clearStore() {
        return this.clearAll();
    }
}

class MMKVLoader {
    initialize() {
        return new MMKVStorage();
    }
}

const listeners = new Map();

function subscribe(key, listener) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(listener);
    return () => {
        const keyListeners = listeners.get(key);
        if (!keyListeners) return;
        keyListeners.delete(listener);
        if (keyListeners.size === 0) listeners.delete(key);
    };
}

function notify(key, value) {
    const keyListeners = listeners.get(key);
    if (keyListeners) keyListeners.forEach((listener) => listener(value));
}

// Values written through the hook are stored the way native MMKV stores them:
// strings as raw strings, everything else as JSON. Reads also accept values
// written by older versions of this shim, which JSON-encoded strings.
export function serializeStoredValue(value) {
    return typeof value === 'string' ? value : JSON.stringify(value);
}

export function deserializeStoredValue(stored) {
    if (stored === null || stored === undefined) return undefined;
    try {
        return JSON.parse(stored);
    } catch (e) {
        return stored;
    }
}

// Mirrors react-native-mmkv-storage's hook: accepts a storage instance as the
// second parameter, keeps every hook using the same key in sync, and treats
// `defaultValue` as a fallback only, so callers may pass inline literals
// without re-triggering reads on every render.
function useMMKVStorage(key, storage, defaultValue) {
    const mmkv = useMemo(() => storage || new MMKVStorage(), [storage]);
    const defaultValueRef = useRef(defaultValue);
    defaultValueRef.current = defaultValue;

    const readValue = useCallback(() => {
        try {
            const stored = deserializeStoredValue(mmkv.getString(key));
            return stored === undefined ? defaultValueRef.current : stored;
        } catch (error) {
            console.error('Error reading key', key, error);
            return defaultValueRef.current;
        }
    }, [key, mmkv]);

    const [value, setValue] = useState(readValue);
    const valueRef = useRef(value);
    valueRef.current = value;

    useEffect(() => {
        setValue(readValue());
        return subscribe(key, setValue);
    }, [key, readValue]);

    const setStoredValue = useCallback(
        (nextValue) => {
            const resolved = typeof nextValue === 'function' ? nextValue(valueRef.current) : nextValue;
            try {
                if (resolved === undefined || resolved === null) {
                    mmkv.removeItem(key);
                } else {
                    mmkv.setString(key, serializeStoredValue(resolved));
                }
            } catch (error) {
                console.error('Error saving key', key, error);
            }
            valueRef.current = resolved;
            notify(key, resolved);
        },
        [key, mmkv]
    );

    return [value, setStoredValue];
}

export { MMKVLoader, MMKVStorage, useMMKVStorage };
export default { Loader: MMKVLoader };
