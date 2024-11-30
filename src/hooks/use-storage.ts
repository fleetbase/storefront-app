import { MMKVLoader, useMMKVStorage as useMMKV } from 'react-native-mmkv-storage';
import { useCallback } from 'react';

// Initialize MMKV storage once, ensuring it’s a singleton
export const storage = new MMKVLoader().initialize();

// Main `useStorage` hook function
function useStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
    return useMMKV<T>(key, storage, defaultValue); // Uses useMMKVStorage to return [value, setter]
}

// Utility functions for direct access
const getString = (key: string) => storage.getString(key);
const setString = (key: string, value: string) => storage.setString(key, value);
const getInt = (key: string) => storage.getInt(key);
const setInt = (key: string, value: number) => storage.setInt(key, value);
const getBool = (key: string) => storage.getBool(key);
const setBool = (key: string, value: boolean) => storage.setBool(key, value);
const getArray = (key: string) => storage.getArray(key);
const setArray = (key: string, value: any[]) => storage.setArray(key, value);

// Custom methods for setting, getting, removing, and clearing maps
const set = (key: string, value: any) => storage.setMap(key, value);
const get = (key: string) => storage.getMap(key);
const remove = (key: string) => storage.removeItem(key);
const clear = () => storage.clearStore();

// Export the hook and individual utility functions
export { useStorage, getString, setString, getInt, setInt, getBool, setBool, getArray, setArray, set, get, remove, clear };

export default useStorage;
