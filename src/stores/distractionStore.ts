import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Distraction {
    id: string;
    type: 'phone' | 'social_media' | 'other';
    timestamp: Date;
    sessionId?: string;
    duration?: number;
}

interface DistractionState {
    distractions: Distraction[];
    logDistraction: (type: Distraction['type'], sessionId?: string, duration?: number) => void;
    resetTodayDistractions: () => void;
    getTodayCount: () => number;
    getWeeklyStats: () => { date: string; count: number }[];
}

export const useDistractionStore = create<DistractionState>()(
    persist(
        (set, get) => ({
            distractions: [],

            logDistraction: (type, sessionId, duration) => set((state) => ({
                distractions: [...state.distractions, {
                    id: crypto.randomUUID(),
                    type,
                    timestamp: new Date(),
                    sessionId,
                    duration,
                }]
            })),

            resetTodayDistractions: () => set((state) => {
                const today = new Date().toDateString();
                return {
                    distractions: state.distractions.filter(
                        (d) => new Date(d.timestamp).toDateString() !== today
                    )
                };
            }),

            getTodayCount: () => {
                const today = new Date().toDateString();
                return get().distractions.filter(
                    (d) => new Date(d.timestamp).toDateString() === today
                ).length;
            },

            getWeeklyStats: () => {
                const stats: Record<string, number> = {};
                const now = new Date();

                for (let i = 6; i >= 0; i--) {
                    const date = new Date(now);
                    date.setDate(date.getDate() - i);
                    stats[date.toDateString()] = 0;
                }

                get().distractions.forEach((d) => {
                    const dateStr = new Date(d.timestamp).toDateString();
                    if (dateStr in stats) {
                        stats[dateStr]++;
                    }
                });

                return Object.entries(stats).map(([date, count]) => ({ date, count }));
            },
        }),
        {
            name: 'focusforge-distractions',
        }
    )
);
