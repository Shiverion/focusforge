import { useMemo } from 'react';
import { useDistractionStore } from '../stores/distractionStore';

export function WeeklyStatsChart() {
    // Subscribe to distractions array to trigger re-renders when data changes
    const distractions = useDistractionStore((s) => s.distractions);

    // Calculate weekly stats from distractions
    const stats = useMemo(() => {
        const statsMap: Record<string, number> = {};
        const now = new Date();

        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            statsMap[date.toDateString()] = 0;
        }

        // Count distractions
        distractions.forEach((d) => {
            const dateStr = new Date(d.timestamp).toDateString();
            if (dateStr in statsMap) {
                statsMap[dateStr]++;
            }
        });

        return Object.entries(statsMap).map(([date, count]) => ({ date, count }));
    }, [distractions]);

    // Fixed max of 25 distractions for scale
    const maxCount = 25;

    const getDayName = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date().toDateString();
        if (dateStr === today) return 'Today';
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    };

    const getBarColor = (count: number) => {
        if (count === 0) return 'bg-green-400';
        if (count <= 3) return 'bg-yellow-400';
        if (count <= 6) return 'bg-orange-400';
        return 'bg-red-400';
    };

    return (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-4">
                📊 Weekly Distraction Trend
            </h3>

            <div className="flex items-end justify-between gap-2 px-2" style={{ height: '200px' }}>
                {stats.map((day, i) => {
                    const barHeight = day.count === 0 ? 8 : Math.max(24, (day.count / maxCount) * 160);
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end max-w-12 h-full">
                            <span className="text-xs font-medium text-slate-400 mb-1">
                                {day.count > 0 ? day.count : ''}
                            </span>
                            <div
                                className={`w-full max-w-10 rounded-lg transition-all shadow-sm ${getBarColor(day.count)}`}
                                style={{ height: `${barHeight}px` }}
                            />
                            <span className="text-xs font-medium text-slate-400 mt-2 truncate w-full text-center">
                                {getDayName(day.date)}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-400" />
                    <span className="text-slate-500">0</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-yellow-400" />
                    <span className="text-slate-500">1-3</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-orange-400" />
                    <span className="text-slate-500">4-6</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-400" />
                    <span className="text-slate-500">7+</span>
                </div>
            </div>
        </div>
    );
}
