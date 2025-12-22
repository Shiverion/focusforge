import { create } from 'zustand';

interface WebcamState {
    isReady: boolean;
    isFaceDetected: boolean;
    isEnabled: boolean;
    setReady: (ready: boolean) => void;
    setFaceDetected: (detected: boolean) => void;
    setEnabled: (enabled: boolean) => void;
}

export const useWebcamStore = create<WebcamState>((set) => ({
    isReady: false,
    isFaceDetected: false,
    isEnabled: false,
    setReady: (ready) => set({ isReady: ready }),
    setFaceDetected: (detected) => set({ isFaceDetected: detected }),
    setEnabled: (enabled) => set({ isEnabled: enabled }),
}));
