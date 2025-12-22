import { useState, useEffect } from 'react';
import { getSessionHistory } from '../lib/database';

// Weekly Focus Time Trend - Bar chart
export function WeeklyFocusChart() {
    const [weeklyData, setWeeklyData] = useState<{ day: string; minutes: number; label: string }[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const history = await getSessionHistory();
            const now = new Date();
            const data: { day: string; minutes: number; label: string }[] = [];

            // Last 7 days
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dateStr = date.toDateString();
                const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : date.toLocaleDateString('en-US', { weekday: 'short' });

                const dayMinutes = history
                    .filter(s => new Date(s.started_at).toDateString() === dateStr)
                    .reduce((acc, s) => acc + (s.duration || 0), 0);

                data.push({
                    day: dateStr,
                    minutes: Math.round(dayMinutes),
                    label: dayLabel
                });
            }

            setWeeklyData(data);
        };
        loadData();
    }, []);

    const maxMinutes = Math.max(...weeklyData.map(d => d.minutes), 60); // At least 60 for scale

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                📈 Weekly Focus Time
            </h3>
            <div className="flex items-end justify-between gap-2 h-32">
                {weeklyData.map((day, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        {/* Bar */}
                        <div className="w-full flex flex-col items-center justify-end h-24">
                            <span className="text-xs text-gray-500 mb-1">
                                {day.minutes > 0 ? `${day.minutes}m` : ''}
                            </span>
                            <div
                                className="w-full max-w-8 rounded-t-md bg-gradient-to-t from-blue-500 to-blue-400 transition-all duration-500"
                                style={{
                                    height: `${Math.max((day.minutes / maxMinutes) * 100, day.minutes > 0 ? 8 : 0)}%`,
                                    minHeight: day.minutes > 0 ? '4px' : '0'
                                }}
                            />
                        </div>
                        {/* Label */}
                        <span className="text-xs text-gray-500 dark:text-gray-400">{day.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Productivity Heatmap - Hour-by-hour grid
export function ProductivityHeatmap() {
    const [heatmapData, setHeatmapData] = useState<Record<string, Record<number, number>>>({});

    useEffect(() => {
        const loadData = async () => {
            const history = await getSessionHistory();
            const data: Record<string, Record<number, number>> = {};

            // Initialize last 7 days
            const now = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dateStr = date.toDateString();
                data[dateStr] = {};
                for (let h = 6; h <= 23; h++) {
                    data[dateStr][h] = 0;
                }
            }

            // Populate with session data
            history.forEach(session => {
                const sessionDate = new Date(session.started_at);
                const dateStr = sessionDate.toDateString();
                const hour = sessionDate.getHours();

                if (data[dateStr] && hour >= 6 && hour <= 23) {
                    data[dateStr][hour] += session.duration || 0;
                }
            });

            setHeatmapData(data);
        };
        loadData();
    }, []);

    const days = Object.keys(heatmapData);
    const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22]; // Show key hours

    const getIntensity = (minutes: number) => {
        if (minutes === 0) return 'bg-gray-100 dark:bg-slate-700';
        if (minutes < 15) return 'bg-green-200 dark:bg-green-900/50';
        if (minutes < 30) return 'bg-green-400 dark:bg-green-700';
        if (minutes < 60) return 'bg-green-500 dark:bg-green-600';
        return 'bg-green-600 dark:bg-green-500';
    };

    const getDayLabel = (dateStr: string, idx: number) => {
        if (idx === days.length - 1) return 'Today';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    };

    const getHourLabel = (hour: number) => {
        if (hour === 12) return '12pm';
        if (hour > 12) return `${hour - 12}pm`;
        return `${hour}am`;
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                🟩 Productivity Heatmap
            </h3>
            <div className="overflow-x-auto">
                <div className="min-w-[400px]">
                    {/* Hour headers */}
                    <div className="flex gap-1 mb-1 ml-12">
                        {hours.map(h => (
                            <div key={h} className="flex-1 text-center text-[10px] text-gray-400">
                                {getHourLabel(h)}
                            </div>
                        ))}
                    </div>

                    {/* Grid rows */}
                    {days.map((dateStr, idx) => (
                        <div key={dateStr} className="flex items-center gap-1 mb-1">
                            <div className="w-10 text-right text-xs text-gray-500 pr-2">
                                {getDayLabel(dateStr, idx)}
                            </div>
                            {hours.map(h => (
                                <div
                                    key={h}
                                    className={`flex-1 h-5 rounded-sm ${getIntensity(heatmapData[dateStr]?.[h] || 0)} transition-colors`}
                                    title={`${getDayLabel(dateStr, idx)} ${getHourLabel(h)}: ${Math.round(heatmapData[dateStr]?.[h] || 0)}min`}
                                />
                            ))}
                        </div>
                    ))}

                    {/* Legend */}
                    <div className="flex items-center justify-end gap-1 mt-3 text-[10px] text-gray-400">
                        <span>Less</span>
                        <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-slate-700" />
                        <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900/50" />
                        <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
                        <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-600" />
                        <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500" />
                        <span>More</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
