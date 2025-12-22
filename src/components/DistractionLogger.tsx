import { useDistractionStore } from '../stores/distractionStore';
import { useTimerStore } from '../stores/timerStore';

export function DistractionLogger() {
    const { logDistraction, resetTodayDistractions, getTodayCount } = useDistractionStore();
    const timerState = useTimerStore((s) => s.state);
    const currentTaskId = useTimerStore((s) => s.currentTaskId);

    const todayCount = getTodayCount();

    const handleLogDistraction = () => {
        logDistraction('phone', currentTaskId || undefined);
    };

    const handleReset = () => {
        if (confirm('Reset today\'s distraction count to 0?')) {
            resetTodayDistractions();
        }
    };

    return (
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-3 mb-3">
                <h3 className="font-semibold text-orange-700 dark:text-orange-400">
                    😵 Distractions Today
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {todayCount}
                    </span>
                    {todayCount > 0 && (
                        <button
                            onClick={handleReset}
                            className="text-xs px-2 py-1 bg-orange-200 hover:bg-orange-300 dark:bg-orange-800 dark:hover:bg-orange-700 text-orange-700 dark:text-orange-300 rounded"
                            title="Reset count"
                        >
                            ↺
                        </button>
                    )}
                </div>
            </div>

            <button
                onClick={handleLogDistraction}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
                <span>⚡</span>
                <span>I got distracted</span>
            </button>

            {timerState === 'focus' && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 text-center">
                    Click when you lose focus or get distracted
                </p>
            )}
        </div>
    );
}
