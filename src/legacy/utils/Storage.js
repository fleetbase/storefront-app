import MMKVStorage, { create, useMMKVStorage } from 'react-native-mmkv-storage';
import { Collection } from '@fleetbase/sdk';
import { isArray, isVoid } from './Helper';

const storage = new MMKVStorage.Loader().initialize();
const useStorage = create(storage);
const { getString, setString, getInt, setInt, getBool, setBool, getArray, setArray } = storage;

/**
 * Storage utility functions.
 *
 * @export
 * @class StorageUtil
 */
export default class StorageUtil {
    /**
     * Returns the initialized storage session from mmkv.
     *
     * @static
     * @return {MMKVStorage}
     * @memberof StorageUtil
     */
    static instance() {
        return storage;
    }

    /**
     * Provides a hook for storing sdk resources in storage.
     *
     * @static
     * @param {string} key
     * @param {class} ResourceType
     * @param {Adapter} adapter
     * @param {*} defaultValue
     * @return {array}
     * @memberof StorageUtil
     */
    static useResourceStorage(key, ResourceType, adapter, defaultValue) {
        const [value, setValue] = useStorage(key, defaultValue);

        const setResource = (resource) => {
            if (isArray(resource) && typeof resource?.invoke === 'function') {
                setValue(resource.invoke('serialize'));
                return;
            }

            if (typeof resource?.serialize === 'function') {
                setValue(resource.serialize());
                return;
            }

            setValue(resource);
        };

        if (value && isArray(value)) {
            return [new Collection(value.map((attributes) => new ResourceType(attributes, adapter))), setResource];
        }

        if (value && typeof value?.serialize === 'function') {
            return [new ResourceType(value.serialize(), adapter), setResource];
        }

        if (value) {
            return [new ResourceType(value, adapter), setResource];
        }

        if ((value === undefined || value === null) && defaultValue !== undefined) {
            return [defaultValue, setResource];
        }

        return [value, setResource];
    }

    /**
     * Provides a hook for storing a collection of sdk resources in storage.
     *
     * @static
     * @param {string} key
     * @param {class} ResourceType
     * @param {Adapter} adapter
     * @param {*} defaultValue
     * @return {array}
     * @memberof StorageUtil
     */
    static useResourceCollection(key, resource, adapter, defaultValue = new Collection()) {
        const [value, setCollection] = useStorage(key, defaultValue);

        const toCollection = (arr, resource) => {
            if (isVoid(arr)) {
                return new Collection();
            }

            if (typeof arr === 'object' && !isArray(arr) && isArray(arr?.items)) {
                return toCollection(arr.items, resource);
            }

            if (isArray(arr) && typeof arr?.invoke === 'function') {
                return arr;
            }

            if (!isArray(arr)) {
                return new Collection();
            }

            return new Collection(arr?.map((attributes) => new resource(attributes, adapter)));
        };

        const setResource = (resource) => {
            if (!isArray(resource)) {
                return setCollection({ items: [resource] });
            }

            if (typeof resource?.invoke !== 'function') {
                return setCollection({ items: resource });
            }

            return setCollection({ items: resource.invoke('serialize') });
        };

        if (value && isArray(value)) {
            return [toCollection(value, resource), setResource];
        }

        if (isVoid(value) || StorageUtil.isStorageObject(value)) {
            return [defaultValue, setResource];
        }

        return [toCollection(value, resource), setResource];
    }

    /**
     * Checks if object is storage state object from mmkv.
     *
     * @static
     * @param {object} obj
     * @return {boolean}
     * @memberof StorageUtil
     */
    static isStorageObject(obj) {
        return typeof obj === 'object' && typeof obj?.instanceID === 'string' && typeof obj?.setMap === 'function';
    }

    /**
     * Sets an element to storage.
     *
     * @static
     * @param {string} key
     * @param {*} value
     * @return {void}
     * @memberof StorageUtil
     */
    static set(key, value) {
        return storage.setMap(key, value);
    }

    /**
     * Retrieves an element from storage.
     *
     * @static
     * @param {string} key
     * @return {*}
     * @memberof StorageUtil
     */
    static get(key) {
        return storage.getMap(key);
    }

    /**
     * Removes an item from storage.
     *
     * @static
     * @param {string} key
     * @return {*}
     * @memberof StorageUtil
     */
    static remove(key) {
        return storage.removeItem(key);
    }

    /**
     * Clears all items from storage.
     *
     * @static
     * @return {void}
     * @memberof StorageUtil
     */
    static clear() {
        return storage.clearStore();
    }
}

const set = StorageUtil.set;
const get = StorageUtil.get;
const remove = StorageUtil.remove;
const clear = StorageUtil.clear;
const useResourceStorage = StorageUtil.useResourceStorage;
const useResourceCollection = StorageUtil.useResourceCollection;

export {
    set,
    get,
    remove,
    clear,
    storage,
    useMMKVStorage,
    useStorage,
    useResourceStorage,
    useResourceCollection,
    getString,
    setString,
    getInt,
    setInt,
    getBool,
    setBool,
    getArray,
    setArray,
};
