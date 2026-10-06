// react-native-device-info.web.js
/* global crypto, localStorage */

const UNIQUE_ID_KEY = 'unique_device_id';

function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

let memoryId = null;

// The id identifies this browser across sessions (it scopes the server cart),
// so it is generated once and reused.
export async function getUniqueId() {
    try {
        const storedId = localStorage.getItem(UNIQUE_ID_KEY);
        if (storedId) return storedId;

        const id = generateUUID();
        localStorage.setItem(UNIQUE_ID_KEY, id);
        return id;
    } catch (error) {
        // Storage can be unavailable (e.g. private browsing); keep the id stable for this page load.
        memoryId = memoryId || generateUUID();
        return memoryId;
    }
}

export function getVersion() {
    return process.env.APP_VERSION || '1.0.0';
}

export default {
    getUniqueId,
    getVersion,
};
