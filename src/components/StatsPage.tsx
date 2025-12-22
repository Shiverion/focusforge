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
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                    ⬅️
                </button>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-500">
                    Stats & Badges
                </h1>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                    icon="🔥"
                    label="Current Streak"
                    value={`${currentStreak} days`}
                    color="from-orange-500 to-red-500"
                />
                <StatCard
                    icon="📚"
                    label="Sessions"
                    value={totalSessions.toString()}
                    color="from-blue-500 to-purple-500"
                />
                <StatCard
                    icon="⏱️"
                    label="Total Time"
                    value={`${Math.round(totalMinutes)} min`}
                    color="from-green-500 to-teal-500"
                />
                <StatCard
                    icon="✅"
                    label="Tasks Done"
                    value={completedTasksCount.toString()}
                    color="from-purple-500 to-pink-500"
                />
            </div>

            {/* Weekly Summary */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-8 shadow-sm border border-gray-100 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                    📊 This Week
                </h2>
                <div className="flex justify-between text-center">
                    <div>
                        <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{weeklyDistractions}</div>
                        <div className="text-xs text-gray-500">Distractions</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-amber-500">{earnedBadges.length}</div>
                        <div className="text-xs text-gray-500">Badges Earned</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-green-500">{Math.round(totalMinutes / 60)}h</div>
                        <div className="text-xs text-gray-500">Total Hours</div>
                    </div>
                </div>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <WeeklyFocusChart />
                <ProductivityHeatmap />
            </div>

            {/* Badges Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">
                    🏆 Badges ({earnedBadges.length}/{11})
                </h2>
                <BadgesGrid />
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white text-lg mb-2`}>
                {icon}
            </div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
        </div>
    );
}
