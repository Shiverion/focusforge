import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Badge {
    id: string;
    name: string;
    description: string;
    emoji: string;
    category: 'streak' | 'focus' | 'milestone';
}

export interface EarnedBadge {
    badgeId: string;
    earnedAt: string;
}

// All available badges
export const BADGES: Badge[] = [
    // Streak badges
    { id: 'spark', name: 'Spark', description: '3-day learning streak', emoji: '🔥', category: 'streak' },
    { id: 'flame', name: 'Flame', description: '7-day learning streak', emoji: '🔥', category: 'streak' },
    { id: 'blaze', name: 'Blaze', description: '30-day learning streak', emoji: '🌋', category: 'streak' },

    // Focus badges
    { id: 'laser-focus', name: 'Laser Focus', description: 'Complete a session with 0 distractions', emoji: '🎯', category: 'focus' },
    { id: 'zen-master', name: 'Zen Master', description: '5 sessions with ≤1 distraction each', emoji: '🧘', category: 'focus' },
    { id: 'untouchable', name: 'Untouchable', description: 'Week with <10 total distractions', emoji: '💎', category: 'focus' },

    // Milestone badges
    { id: 'first-steps', name: 'First Steps', description: 'Complete your first task', emoji: '👣', category: 'milestone' },
    { id: 'scholar', name: 'Scholar', description: 'Complete 10 tasks', emoji: '📚', category: 'milestone' },
    { id: 'deep-diver', name: 'Deep Diver', description: '5+ hours total learning time', emoji: '🌊', category: 'milestone' },
    { id: 'night-owl', name: 'Night Owl', description: 'Complete session after 10pm', emoji: '🦉', category: 'milestone' },
    { id: 'early-bird', name: 'Early Bird', description: 'Complete session before 7am', emoji: '🐦', category: 'milestone' },
];

interface BadgeState {
    earnedBadges: EarnedBadge[];

    // Actions
    earnBadge: (badgeId: string) => void;
    hasBadge: (badgeId: string) => boolean;
    getEarnedBadges: () => Badge[];

    // Check functions (call after session ends)
    checkStreakBadges: (sessionDates: Date[]) => string[];
    checkFocusBadges: (sessionDistractionCounts: number[]) => string[];
    checkMilestoneBadges: (completedTaskCount: number, totalMinutes: number, sessionHour: number) => string[];
}

export const useBadgeStore = create<BadgeState>()(
    persist(
        (set, get) => ({
            earnedBadges: [],

            earnBadge: (badgeId: string) => {
                if (!get().hasBadge(badgeId)) {
                    set((state) => ({
                        earnedBadges: [...state.earnedBadges, {
                            badgeId,
                            earnedAt: new Date().toISOString()
                        }]
                    }));
                    console.log(`🏆 Badge earned: ${badgeId}`);
                }
            },

            hasBadge: (badgeId: string) => {
                return get().earnedBadges.some(b => b.badgeId === badgeId);
            },

            getEarnedBadges: () => {
                const earned = get().earnedBadges;
                return BADGES.filter(b => earned.some(e => e.badgeId === b.id));
            },

            checkStreakBadges: (sessionDates: Date[]) => {
                const newBadges: string[] = [];
                if (sessionDates.length === 0) return newBadges;

                // Calculate current streak
                const sortedDates = [...new Set(sessionDates.map(d => d.toDateString()))]
                    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

                let streak = 1;
                const today = new Date().toDateString();
                const yesterday = new Date(Date.now() - 86400000).toDateString();

                // Check if streak is active (today or yesterday)
                if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
                    return newBadges; // Streak broken
                }

                for (let i = 0; i < sortedDates.length - 1; i++) {
                    const current = new Date(sortedDates[i]);
                    const prev = new Date(sortedDates[i + 1]);
                    const diff = (current.getTime() - prev.getTime()) / 86400000;

                    if (diff === 1) {
                        streak++;
                    } else {
                        break;
                    }
                }

                if (streak >= 3 && !get().hasBadge('spark')) {
                    get().earnBadge('spark');
                    newBadges.push('spark');
                }
                if (streak >= 7 && !get().hasBadge('flame')) {
                    get().earnBadge('flame');
                    newBadges.push('flame');
                }
                if (streak >= 30 && !get().hasBadge('blaze')) {
                    get().earnBadge('blaze');
                    newBadges.push('blaze');
                }

                return newBadges;
            },

            checkFocusBadges: (sessionDistractionCounts: number[]) => {
                const newBadges: string[] = [];

                // Laser Focus: 0 distractions in last session
                if (sessionDistractionCounts.length > 0 && sessionDistractionCounts[sessionDistractionCounts.length - 1] === 0) {
                    if (!get().hasBadge('laser-focus')) {
                        get().earnBadge('laser-focus');
                        newBadges.push('laser-focus');
                    }
                }

                // Zen Master: Last 5 sessions all ≤1 distraction
                if (sessionDistractionCounts.length >= 5) {
                    const lastFive = sessionDistractionCounts.slice(-5);
                    if (lastFive.every(c => c <= 1) && !get().hasBadge('zen-master')) {
                        get().earnBadge('zen-master');
                        newBadges.push('zen-master');
                    }
                }

                // Untouchable: Last 7 days < 10 total distractions
                // This would need weekly distraction data - simplified check
                const weekTotal = sessionDistractionCounts.slice(-7).reduce((a, b) => a + b, 0);
                if (weekTotal < 10 && sessionDistractionCounts.length >= 7 && !get().hasBadge('untouchable')) {
                    get().earnBadge('untouchable');
                    newBadges.push('untouchable');
                }

                return newBadges;
            },

            checkMilestoneBadges: (completedTaskCount: number, totalMinutes: number, sessionHour: number) => {
                const newBadges: string[] = [];

                // First Steps
                if (completedTaskCount >= 1 && !get().hasBadge('first-steps')) {
                    get().earnBadge('first-steps');
                    newBadges.push('first-steps');
                }

                // Scholar
                if (completedTaskCount >= 10 && !get().hasBadge('scholar')) {
                    get().earnBadge('scholar');
                    newBadges.push('scholar');
                }

                // Deep Diver (5+ hours = 300 minutes)
                if (totalMinutes >= 300 && !get().hasBadge('deep-diver')) {
                    get().earnBadge('deep-diver');
                    newBadges.push('deep-diver');
                }

                // Night Owl (after 10pm = hour >= 22)
                if (sessionHour >= 22 && !get().hasBadge('night-owl')) {
                    get().earnBadge('night-owl');
                    newBadges.push('night-owl');
                }

                // Early Bird (before 7am = hour < 7)
                if (sessionHour < 7 && !get().hasBadge('early-bird')) {
                    get().earnBadge('early-bird');
                    newBadges.push('early-bird');
                }

                return newBadges;
            },
        }),
        {
            name: 'focusforge-badges',
        }
    )
);
