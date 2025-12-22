import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { encrypt, decrypt } from '../lib/encryption';

interface SettingsState {
    geminiApiKey: string;
    pushoverUserKey: string;
    pushoverAppToken: string;
    focusDuration: number;
    breakDuration: number;
    enableNotifications: boolean;
    enablePushover: boolean;
    enableSounds: boolean;

    setGeminiApiKey: (key: string) => void;
    setPushoverKeys: (userKey: string, appToken: string) => void;
    setDurations: (focus: number, breakTime: number) => void;
    toggleNotifications: () => void;
    togglePushover: () => void;
    toggleSounds: () => void;
}

// Custom storage that encrypts sensitive data
const encryptedStorage = createJSONStorage(() => ({
    getItem: (name: string) => {
        const item = localStorage.getItem(name);
        if (!item) return null;

        try {
            const parsed = JSON.parse(item);
            // Decrypt sensitive fields
            if (parsed.state) {
                if (parsed.state.geminiApiKey) {
                    parsed.state.geminiApiKey = decrypt(parsed.state.geminiApiKey);
                }
                if (parsed.state.pushoverUserKey) {
                    parsed.state.pushoverUserKey = decrypt(parsed.state.pushoverUserKey);
                }
                if (parsed.state.pushoverAppToken) {
                    parsed.state.pushoverAppToken = decrypt(parsed.state.pushoverAppToken);
                }
            }
            return JSON.stringify(parsed);
        } catch {
            return item;
        }
    },
    setItem: (name: string, value: string) => {
        try {
            const parsed = JSON.parse(value);
            // Encrypt sensitive fields
            if (parsed.state) {
                if (parsed.state.geminiApiKey) {
                    parsed.state.geminiApiKey = encrypt(parsed.state.geminiApiKey);
                }
                if (parsed.state.pushoverUserKey) {
                    parsed.state.pushoverUserKey = encrypt(parsed.state.pushoverUserKey);
                }
                if (parsed.state.pushoverAppToken) {
                    parsed.state.pushoverAppToken = encrypt(parsed.state.pushoverAppToken);
                }
            }
            localStorage.setItem(name, JSON.stringify(parsed));
        } catch {
            localStorage.setItem(name, value);
        }
    },
    removeItem: (name: string) => localStorage.removeItem(name),
}));

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            geminiApiKey: '',
            pushoverUserKey: '',
            pushoverAppToken: '',
            focusDuration: 25,
            breakDuration: 5,
            enableNotifications: true,
            enablePushover: false,
            enableSounds: true,

            setGeminiApiKey: (key) => set({ geminiApiKey: key }),

            setPushoverKeys: (userKey, appToken) => set({
                pushoverUserKey: userKey,
                pushoverAppToken: appToken,
            }),

            setDurations: (focus, breakTime) => set({
                focusDuration: focus,
                breakDuration: breakTime,
            }),

            toggleNotifications: () => set((s) => ({
                enableNotifications: !s.enableNotifications,
            })),

            togglePushover: () => set((s) => ({
                enablePushover: !s.enablePushover,
            })),

            toggleSounds: () => set((s) => ({
                enableSounds: !s.enableSounds,
            })),
        }),
        {
            name: 'focusforge-settings',
            storage: encryptedStorage,
        }
    )
);
