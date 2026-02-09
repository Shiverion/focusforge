import { useState, useEffect, useMemo } from 'react';
import { BadgesGrid } from './Badges';
import { useDistractionStore } from '../stores/distractionStore';
import { useTaskStore } from '../stores/taskStore';
import { useBadgeStore } from '../stores/badgeStore';
import { getSessionHistory } from '../lib/database';
import { WeeklyFocusChart, ProductivityHeatmap } from './AnalyticsCharts';

interface StatsPageProps {
    onBack: () => void;
}

export function StatsPage({ onBack }: StatsPageProps) {
    const [totalSessions, setTotalSessions] = useState(0);
    const [totalMinutes, setTotalMinutes] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);

    const distractions = useDistractionStore((s) => s.distractions);
    const tasks = useTaskStore((s) => s.tasks);
    const earnedBadges = useBadgeStore((s) => s.earnedBadges);

    // Load session stats
    useEffect(() => {
        const loadStats = async () => {
            const history = await getSessionHistory();
            setTotalSessions(history.length);
            setTotalMinutes(history.reduce((acc, s) => acc + (s.duration || 0), 0));

            // Calculate streak
            const dates = [...new Set(history.map(s => new Date(s.started_at).toDateString()))];
            dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

            let streak = 0;
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();

            if (dates[0] === today || dates[0] === yesterday) {
                streak = 1;
                for (let i = 0; i < dates.length - 1; i++) {
                    const curr = new Date(dates[i]);
                    const prev = new Date(dates[i + 1]);
                    const diff = (curr.getTime() - prev.getTime()) / 86400000;
                    if (diff === 1) {
                        streak++;
                    } else {
                        break;
                    }
                }
            }
            setCurrentStreak(streak);
        };
        loadStats();
    }, []);

    const completedTasksCount = useMemo(() =>
        tasks.filter(t => t.completed).length,
        [tasks]
    );

    const weeklyDistractions = useMemo(() => {
        const weekAgo = Date.now() - 7 * 86400000;
        return distractions.filter(d => new Date(d.timestamp).getTime() > weekAgo).length;
    }, [distractions]);

    return (
        <div className="p-6 max-w-4xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-3 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                >
                    ⬅️
                </button>
                <h1 className="text-3xl font-display font-bold text-stone-800 dark:text-stone-100">
                    Stats & Badges
                </h1>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                    icon="🔥"
                    label="Current Streak"
                    value={`${currentStreak} days`}
                    gradient="from-orange-500 to-red-500"
                    glow="shadow-orange-500/20"
                />
                <StatCard
                    icon="📚"
                    label="Sessions"
                    value={totalSessions.toString()}
                    gradient="from-blue-500 to-indigo-500"
                    glow="shadow-blue-500/20"
                />
                <StatCard
                    icon="⏱️"
                    label="Total Time"
                    value={`${Math.round(totalMinutes)} min`}
                    gradient="from-emerald-500 to-teal-500"
                    glow="shadow-emerald-500/20"
                />
                <StatCard
                    icon="✅"
                    label="Tasks Done"
                    value={completedTasksCount.toString()}
                    gradient="from-purple-500 to-violet-500"
                    glow="shadow-purple-500/20"
                />
            </div>

            {/* Weekly Summary */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 mb-8 shadow-sm border border-stone-100 dark:border-stone-800">
                <h2 className="text-lg font-display font-semibold text-stone-800 dark:text-stone-200 mb-5">
                    📊 This Week
                </h2>
                <div className="flex justify-between text-center divide-x divide-stone-100 dark:divide-stone-800">
                    <div className="px-4 flex-1">
                        <div className="text-3xl font-display font-bold text-stone-800 dark:text-stone-200">{weeklyDistractions}</div>
                        <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mt-1">Distractions</div>
                    </div>
                    <div className="px-4 flex-1">
                        <div className="text-3xl font-display font-bold text-amber-500">{earnedBadges.length}</div>
                        <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mt-1">Badges Earned</div>
                    </div>
                    <div className="px-4 flex-1">
                        <div className="text-3xl font-display font-bold text-emerald-500">{Math.round(totalMinutes / 60)}h</div>
                        <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mt-1">Total Hours</div>
                    </div>
                </div>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <WeeklyFocusChart />
                <ProductivityHeatmap />
            </div>

            {/* Badges Section */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-sm border border-stone-100 dark:border-stone-800">
                <h2 className="text-lg font-display font-semibold text-stone-800 dark:text-stone-200 mb-6">
                    🏆 Badges ({earnedBadges.length}/{11})
                </h2>
                <BadgesGrid />
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, gradient, glow }: { icon: string; label: string; value: string; gradient: string; glow: string }) {
    return (
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 shadow-sm border border-stone-100 dark:border-stone-800 relative overflow-hidden group hover:-translate-y-0.5 transition-transform duration-200">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xl mb-3 shadow-lg ${glow}`}>
                {icon}
            </div>
            <div className="text-2xl font-display font-bold text-stone-800 dark:text-stone-100">{value}</div>
            <div className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</div>
        </div>
    );
}
