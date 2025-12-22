import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { QuickNoteForm } from './components/QuickNoteForm';
import { useNoteStore } from './stores/noteStore';

interface TimerStatePayload {
    state: string;
    currentTaskId: string | null;
    currentSessionId: string | null;
}

interface Task {
    id: string;
    title: string;
    completed: boolean;
}

export function QuickNoteWindow() {
    const addNote = useNoteStore((s) => s.addNote);

    // Timer state received from main window via Tauri events
    const [timerState, setTimerState] = useState<TimerStatePayload>({
        state: 'idle',
        currentTaskId: null,
        currentSessionId: null
    });

    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    useEffect(() => {
        // Listen for timer state updates from main window
        const unlisten = listen<TimerStatePayload>('timer-state-update', (event) => {
            console.log('[QuickNote] Received timer state:', event.payload);
            setTimerState(event.payload);
            setSelectedTaskId(event.payload.currentTaskId);
        });

        // Load timer state from localStorage as fallback
        const stored = localStorage.getItem('focusforge-timer');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.state) {
                    setTimerState({
                        state: parsed.state.state || 'idle',
                        currentTaskId: parsed.state.currentTaskId || null,
                        currentSessionId: parsed.state.currentSessionId || null
                    });
                    setSelectedTaskId(parsed.state.currentTaskId || null);
                    console.log('[QuickNote] Loaded timer state from localStorage:', parsed.state);
                }
            } catch (e) {
                console.error('[QuickNote] Failed to load timer state:', e);
            }
        }

        // Load tasks from localStorage
        const tasksStored = localStorage.getItem('focusforge-tasks');
        if (tasksStored) {
            try {
                const parsed = JSON.parse(tasksStored);
                if (parsed.state?.tasks) {
                    setTasks(parsed.state.tasks);
                }
            } catch (e) {
                console.error('[QuickNote] Failed to load tasks:', e);
            }
        }

        // Apply theme preference
        const isDark = localStorage.getItem('theme') === 'dark' ||
            (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        return () => {
            unlisten.then(fn => fn());
        };
    }, []);

    const handleSave = async (note: string) => {
        console.log('[QuickNote] Saving note with:', {
            taskId: selectedTaskId,
            sessionId: timerState.currentSessionId,
            state: timerState.state
        });
        addNote(note, selectedTaskId || undefined, timerState.currentSessionId || undefined);
        await getCurrentWindow().hide();
    };

    const handleClose = async () => {
        try {
            await getCurrentWindow().hide();
        } catch (e) {
            console.error(e);
            alert('Error closing window: ' + JSON.stringify(e));
        }
    };

    // Allow notes during focus OR paused (still in an active session)
    const isFocusSession = timerState.state === 'focus' || timerState.state === 'paused';
    const incompleteTasks = tasks.filter(t => !t.completed);

    return (
        <div className="h-screen w-screen bg-slate-50 dark:bg-slate-900 flex flex-col border border-gray-300 dark:border-slate-700 overflow-hidden">
            <div className="h-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex select-none">
                {/* Drag Region - Flex Grow */}
                <div
                    data-tauri-drag-region
                    className="flex-1 flex items-center px-4 cursor-move"
                >
                    <span className="font-semibold text-sm text-gray-700 dark:text-gray-200 pointer-events-none">
                        {isFocusSession ? '📝 Quick Note' : '🔒 Locked'}
                    </span>
                </div>

                {/* Close Button - Fixed Width */}
                <button
                    onClick={handleClose}
                    className="w-12 h-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors"
                >
                    ✕
                </button>
            </div>

            {isFocusSession ? (
                <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
                    {/* Task Selector */}
                    <div className="px-4 pt-3">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Save to task:
                        </label>
                        <select
                            value={selectedTaskId || ''}
                            onChange={(e) => setSelectedTaskId(e.target.value || null)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-800 dark:text-gray-200"
                        >
                            <option value="">Current Session (General)</option>
                            {incompleteTasks.map(task => (
                                <option key={task.id} value={task.id}>
                                    {task.title} {task.id === timerState.currentTaskId ? '(Current)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <QuickNoteForm onSave={handleSave} onCancel={handleClose} className="flex-1" />
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-900">
                    <div className="text-4xl mb-4">🍅</div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
                        Focus First!
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Quick notes are only available during an active focus session.
                    </p>
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}