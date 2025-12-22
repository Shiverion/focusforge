import CryptoJS from 'crypto-js';

// Device-specific key derived from browser fingerprint
const getDeviceKey = (): string => {
    const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset(),
    ].join('|');

    return CryptoJS.SHA256(fingerprint).toString().substring(0, 32);
};

const DEVICE_KEY = getDeviceKey();

export const encrypt = (text: string): string => {
    if (!text) return '';
    return CryptoJS.AES.encrypt(text, DEVICE_KEY).toString();
};

export const decrypt = (ciphertext: string): string => {
    if (!ciphertext) return '';
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, DEVICE_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
        // If decryption fails, return empty (probably unencrypted old value)
        return '';
    }
};
