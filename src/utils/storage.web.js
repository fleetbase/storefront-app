import { MMKVLoader, useMMKVStorage } from '../../web/react-native-mmkv-storage';

const storage = new MMKVLoader().initialize();

export function get(key) {
    return storage.getMap(key);
}

export function getString(key) {
    return storage.getString(key);
}

export function getInt(key) {
    return storage.getInt(key);
}

export function getBool(key) {
    return storage.getBool(key);
}

export function getArray(key) {
    return storage.getArray(key);
}

export function getMap(key) {
    return storage.getMap(key);
}

export function set(key, value) {
    return storage.setMap(key, value);
}

export function setString(key, value) {
    return storage.setString(key);
}

export function setInt(key, value) {
    return storage.setInt(key);
}

export function setBool(key, value) {
    return storage.setBool(key);
}

export function setArray(key, value) {
    return storage.setArray(key);
}

export function setMap(key, value) {
    return storage.setMap(key);
}

export function remove(key) {
    return storage.removeItem(key);
}

export function clear() {
    return storage.clearStore();
}

export default storage;
