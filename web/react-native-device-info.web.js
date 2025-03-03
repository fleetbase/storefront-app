// react-native-device-info.web.js

export async function getUniqueId() {
    // If available, use the native crypto.randomUUID
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        const id = crypto.randomUUID();
        // Optionally, store the ID so it's reused across sessions
        localStorage.setItem('unique_device_id', id);
        return id;
    }
    // Fallback: Check if we already stored a unique ID in localStorage
    let storedId = localStorage.getItem('unique_device_id');
    if (storedId) {
        return storedId;
    }
    // Fallback: Generate a simple UUID
    const generateUUID = () =>
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    storedId = generateUUID();
    localStorage.setItem('unique_device_id', storedId);
    return storedId;
}

export function getVersion() {
    return process.env.APP_VERSION || '1.0.0';
}

export default {
    getUniqueId,
    getVersion,
};
