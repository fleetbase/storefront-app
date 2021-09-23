import MMKVStorage, { create, useMMKVStorage } from "react-native-mmkv-storage";
import { Collection } from '@fleetbase/sdk';

const { isArray } = Array;
const storage = new MMKVStorage.Loader().initialize(); 
const useStorage = create(storage);
const { getString, setString, getInt, setInt, getBool, setBool, getArray, setArray } = storage;

const useResourceStorage = (key, ResourceType, adapter, defaultValue) => {
    const [value, setValue] = useMMKVStorage(key, storage);

    const setResource = (resource) => {
        if (resource instanceof Collection) {
            setValue(resource.invoke('serialize'));
            return;
        }

        if (typeof resource?.serialize === 'function') {
            setValue(resource.serialize());
            return;
        }        

        setValue(resource);
    }

    if (value && isArray(value)) {
        return [new Collection(value.map(r => new ResourceType(r, adapter))), setResource];
    }

    if (value) {
        return [new ResourceType(value, adapter), setResource];
    }    

    if ((value === undefined || value === null) && defaultValue !== undefined) {
        return [defaultValue, setResource];
    }

    return [value, setResource];
};

const set = (key, value) => {
    return storage.setMap(key, value);
};

const get = (key) => {
    return storage.getMap(key);
};

const remove = (key) => {
    return storage.removeItem(key);
};

const clear = () => {
    return storage.clearStore();
}

export default storage;
export { useMMKVStorage, useStorage, useResourceStorage, get, set, remove, clear, getString, setString, getInt, setInt, getBool, setBool, getArray, setArray };
