import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type TimerState = 'idle' | 'focus' | 'break' | 'paused';

interface TimerStore {
    state: TimerState;
    currentTaskId: string | null;
    currentSessionId: string | null;
    elapsed: number;
    focusDuration: number; // in seconds
    breakDuration: number; // in seconds
    sessionsCompleted: number;

    // Actions
    startFocus: (taskId: string) => void;
    startBreak: () => void;
    pause: () => void;
    resume: () => void;
    reset: () => void;
    skip: () => void;
    tick: () => void;
    setDurations: (focus: number, breakTime: number) => void;
}

export const useTimerStore = create<TimerStore>()(
    persist(
        (set, get) => ({
            state: 'idle',
            currentTaskId: null,
            currentSessionId: null,
            elapsed: 0,
            focusDuration: 25 * 60, // 25 minutes
            breakDuration: 5 * 60,  // 5 minutes
            sessionsCompleted: 0,

            startFocus: (taskId) => {
                const newSessionId = crypto.randomUUID();
                set({
                    state: 'focus',
                    currentTaskId: taskId,
                    currentSessionId: newSessionId,
                    elapsed: 0,
                });
                // Immediately sync to localStorage for cross-window access
                localStorage.setItem('focusforge-timer', JSON.stringify({
                    state: { state: 'focus', currentTaskId: taskId, currentSessionId: newSessionId }
                }));
            },

            startBreak: () => set((s) => {
                const newState = {
                    state: 'break' as const,
                    elapsed: 0,
                    sessionsCompleted: s.sessionsCompleted + 1,
                };
                // Sync to localStorage
                localStorage.setItem('focusforge-timer', JSON.stringify({
                    state: { ...newState, currentTaskId: s.currentTaskId, currentSessionId: s.currentSessionId }
                }));
                return newState;
            }),

            pause: () => {
                set({ state: 'paused' });
                const s = get();
                localStorage.setItem('focusforge-timer', JSON.stringify({
                    state: { state: 'paused', currentTaskId: s.currentTaskId, currentSessionId: s.currentSessionId }
                }));
            },

            resume: () => set((s) => {
                const newState = s.currentTaskId ? 'focus' : 'break';
                localStorage.setItem('focusforge-timer', JSON.stringify({
                    state: { state: newState, currentTaskId: s.currentTaskId, currentSessionId: s.currentSessionId }
                }));
                return { state: newState };
            }),

            reset: () => {
                set({
                    state: 'idle',
                    currentTaskId: null,
                    elapsed: 0,
                });
                localStorage.setItem('focusforge-timer', JSON.stringify({
                    state: { state: 'idle', currentTaskId: null, currentSessionId: null }
                }));
            },

            skip: () => {
                const { state, currentTaskId } = get();
                if (state === 'focus') {
                    set((s) => ({
                        state: 'break',
                        elapsed: 0,
                        sessionsCompleted: s.sessionsCompleted + 1,
                    }));
                } else if (state === 'break' && currentTaskId) {
                    set({
                        state: 'focus',
                        elapsed: 0,
                    });
                } else {
                    set({
                        state: 'idle',
                        elapsed: 0,
                    });
                }
            },

            tick: () => set((s) => ({ elapsed: s.elapsed + 1 })),

            setDurations: (focus, breakTime) => set({
                focusDuration: focus,
                breakDuration: breakTime,
            }),
        }),
        {
            name: 'focusforge-timer',
            partialize: (state) => ({
                state: state.state,
                currentTaskId: state.currentTaskId,
                currentSessionId: state.currentSessionId,
                focusDuration: state.focusDuration,
                breakDuration: state.breakDuration,
                sessionsCompleted: state.sessionsCompleted,
            }),
        }
    )
);
