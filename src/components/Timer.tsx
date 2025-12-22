import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTimerStore } from '../stores/timerStore';
import { useTaskStore } from '../stores/taskStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useWebcamStore } from '../stores/webcamStore';
import { showDesktopNotification, desktopNotifications, requestNotificationPermission } from '../lib/notifications';
import { sendPushoverNotification, notifications as pushoverNotifications } from '../lib/pushover';
import { saveSession } from '../lib/database';
import { playFocusCompleteSound, playBreakOverSound } from '../lib/sounds';
import { SessionWizard } from './SessionWizard/SessionWizard';

export function Timer() {
    const {
        state,
        elapsed,
        focusDuration,
        breakDuration,
        currentTaskId,
        startFocus,
        pause,
        resume,
        reset,
        skip,
        tick
    } = useTimerStore();

    const tasks = useTaskStore((s) => s.tasks);
    const currentTask = tasks.find((t) => t.id === currentTaskId);
    const settings = useSettingsStore();
    const setDurations = useTimerStore((s) => s.setDurations);

    // Sync settings durations with timer store (convert minutes to seconds)
    useEffect(() => {
        setDurations(settings.focusDuration * 60, settings.breakDuration * 60);
    }, [settings.focusDuration, settings.breakDuration, setDurations]);

    // Webcam state - camera must be ready and face detected to start
    const { isReady: cameraReady, isFaceDetected, isEnabled: cameraEnabled } = useWebcamStore();
    const canStartFocus = cameraEnabled && cameraReady && isFaceDetected;

    // Learning prompts state
    const [showSessionWizard, setShowSessionWizard] = useState(false);
    const [completedSessionDuration, setCompletedSessionDuration] = useState(0);
    const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);
    const [completedTaskId, setCompletedTaskId] = useState<string | null>(null);

    // Camera enforcement modal
    const [showCameraPausedModal, setShowCameraPausedModal] = useState(false);

    const duration = state === 'break' ? breakDuration : focusDuration;
    const remaining = Math.max(0, duration - elapsed);
    const progress = (elapsed / duration) * 100;

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} `;
    };

    // Update system tray
    useEffect(() => {
        const updateTray = async () => {
            try {
                let status = 'FocusForge';
                if (state === 'focus') {
                    status = `🎯 Focus: ${formatTime(remaining)} `;
                } else if (state === 'break') {
                    status = `☕ Break: ${formatTime(remaining)} `;
                } else {
                    status = 'FocusForge - Ready';
                }

                // Only called in Tauri environment
                // Update tray title
                if ((window as any).__TAURI__) {
                    try {
                        await invoke('update_tray_title', { title: status });
                    } catch (error) {
                        console.error('Failed to update tray:', error);
                    }
                }
            } catch (e) {
                // Ignore errors
            }
        };
        updateTray();
    }, [state, remaining]);

    // Request notification permission on mount
    useEffect(() => {
        requestNotificationPermission();
    }, []);

    // Timer tick effect
    useEffect(() => {
        if (state !== 'focus' && state !== 'break') return;

        const interval = setInterval(() => {
            tick();
        }, 1000);

        return () => clearInterval(interval);
    }, [state, tick]);

    // Auto-transition when timer completes
    useEffect(() => {
        if (remaining === 0 && state === 'focus') {
            const taskTitle = currentTask?.title || 'Focus session';

            // Desktop notification
            showDesktopNotification(desktopNotifications.focusComplete(taskTitle));

            // Sound notification
            if (settings.enableSounds) {
                playFocusCompleteSound();
            }

            // Pushover phone notification
            if (settings.enablePushover && settings.pushoverUserKey && settings.pushoverAppToken) {
                sendPushoverNotification(
                    settings.pushoverUserKey,
                    settings.pushoverAppToken,
                    pushoverNotifications.focusComplete(taskTitle)
                );
            }

            // Show learning prompts
            // Show learning prompts
            setCompletedSessionDuration(focusDuration / 60);
            // Capture context
            const currentSid = useTimerStore.getState().currentSessionId;
            setCompletedSessionId(currentSid);
            setCompletedTaskId(currentTaskId);

            // Save basic session data to DB
            if (currentSid) {
                const endedAt = new Date();
                const startedAt = new Date(endedAt.getTime() - focusDuration * 1000);
                saveSession({
                    id: currentSid,
                    taskId: currentTaskId || 'general',
                    duration: focusDuration / 60,
                    startedAt: startedAt.toISOString(),
                    endedAt: endedAt.toISOString(),
                    completed: true,
                    interruptions: 0
                });
            }

            setShowSessionWizard(true);

            skip();
        } else if (remaining === 0 && state === 'break') {
            // Desktop notification
            showDesktopNotification(desktopNotifications.breakOver());

            // Sound notification
            if (settings.enableSounds) {
                playBreakOverSound();
            }

            // Pushover
            if (settings.enablePushover && settings.pushoverUserKey && settings.pushoverAppToken) {
                sendPushoverNotification(
                    settings.pushoverUserKey,
                    settings.pushoverAppToken,
                    pushoverNotifications.breakOver()
                );
            }

            reset();
        }
    }, [remaining, state, skip, reset, currentTask, settings, focusDuration]);

    // Camera enforcement: auto-pause when camera is disabled during focus
    useEffect(() => {
        // If we're in focus mode and camera gets disabled, pause and show modal
        if (state === 'focus' && !cameraEnabled) {
            pause();
            setShowCameraPausedModal(true);
        }
        // If camera is re-enabled while modal is showing, close it
        if (cameraEnabled && showCameraPausedModal) {
            setShowCameraPausedModal(false);
        }
    }, [state, cameraEnabled, pause, showCameraPausedModal]);

    // SVG progress ring calculations
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    const getStateColor = () => {
        switch (state) {
            case 'focus': return 'text-red-500';
            case 'break': return 'text-green-500';
            case 'paused': return 'text-yellow-500';
            default: return 'text-gray-400';
        }
    };

    const getStateLabel = () => {
        switch (state) {
            case 'focus': return 'FOCUSING';
            case 'break': return 'BREAK TIME';
            case 'paused': return 'PAUSED';
            default: return 'READY';
        }
    };

    // Task Selection State
    const [showTaskSelector, setShowTaskSelector] = useState(false);

    const handleStartRequest = () => {
        if (currentTaskId) {
            startFocus(currentTaskId);
        } else {
            setShowTaskSelector(true);
        }
    };

    const handleSelectTask = (taskId: string) => {
        if (!canStartFocus) return;
        startFocus(taskId);
        setShowTaskSelector(false);
    };

    const handleGeneralFocus = () => {
        if (!canStartFocus) return;
        startFocus('general');
        setShowTaskSelector(false);
    };

    const getDisplayTitle = () => {
        if (currentTaskId === 'general') return 'General Learning';
        return currentTask?.title || 'Focus session';
    };

    const handleFinishEarly = async () => {
        // Calculate actual duration in minutes
        setCompletedSessionDuration(elapsed / 60);

        // Capture context before reset
        const currentSid = useTimerStore.getState().currentSessionId;
        setCompletedSessionId(currentSid);
        setCompletedTaskId(currentTaskId);

        // Save session data
        if (currentSid) {
            const endedAt = new Date();
            const startedAt = new Date(endedAt.getTime() - elapsed * 1000);
            await saveSession({
                id: currentSid,
                taskId: currentTaskId || 'general',
                duration: elapsed / 60,
                startedAt: startedAt.toISOString(),
                endedAt: endedAt.toISOString(),
                completed: true,
                interruptions: 0
            });
        }

        setShowSessionWizard(true);
        // Reset to idle or break? User asked to end session.
        // Let's reset to idle to stop the timer completely.
        reset();
    };

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Progress Ring */}
            <div className="relative">
                <svg width="280" height="280" className="transform -rotate-90">
                    <circle
                        cx="140"
                        cy="140"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                        cx="140"
                        cy="140"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        className={`transition-all duration-1000 ${getStateColor()}`}
                        style={{
                            strokeDasharray: circumference,
                            strokeDashoffset,
                        }}
                    />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-5xl font-mono font-bold ${getStateColor()}`}>
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">
                        {getStateLabel()}
                    </span>
                    {(currentTaskId || currentTask) && (
                        <span className="text-xs text-blue-500 dark:text-blue-400 mt-1 max-w-[180px] truncate font-medium bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                            {getDisplayTitle()}
                        </span>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-3">
                {state === 'idle' && (
                    <>
                        <button
                            onClick={handleStartRequest}
                            disabled={!canStartFocus}
                            className={`px-6 py-3 font-semibold rounded-xl transition-colors ${canStartFocus
                                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-red-500/30'
                                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            Start Focus
                        </button>
                        {!canStartFocus && (
                            <p className="text-xs text-amber-500 dark:text-amber-400 text-center max-w-[220px]">
                                {!cameraEnabled
                                    ? '📷 Enable camera detection below to start'
                                    : !cameraReady
                                        ? '⏳ Waiting for camera to initialize...'
                                        : '👤 Position your face in camera view'}
                            </p>
                        )}
                    </>
                )}

                {state === 'focus' && (
                    <div className="flex gap-3">
                        <button
                            onClick={pause}
                            className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl transition-colors shadow-lg hover:shadow-yellow-500/30"
                        >
                            Pause
                        </button>
                        <button
                            onClick={skip}
                            className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
                        >
                            Break
                        </button>
                        <button
                            onClick={handleFinishEarly}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors shadow-lg hover:shadow-purple-600/30"
                        >
                            Finish Learning
                        </button>
                    </div>
                )}

                {state === 'break' && (
                    <div className="flex gap-3">
                        <button
                            onClick={pause}
                            className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl transition-colors shadow-lg hover:shadow-yellow-500/30"
                        >
                            Pause
                        </button>
                        <button
                            onClick={skip}
                            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors shadow-lg hover:shadow-green-500/30"
                        >
                            Continue
                        </button>
                        <button
                            onClick={handleFinishEarly}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors shadow-lg hover:shadow-purple-600/30"
                        >
                            Finish Learning
                        </button>
                    </div>
                )}

                {state === 'paused' && (
                    <div className="flex gap-3">
                        <button
                            onClick={resume}
                            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors shadow-lg hover:shadow-green-500/30"
                        >
                            Resume
                        </button>
                        <button
                            onClick={reset}
                            className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
                        >
                            Reset
                        </button>
                    </div>
                )}
            </div>

            {/* Task Selector Modal */}
            {showTaskSelector && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                                🎯 What are you learning?
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">Select a task to track your focus session.</p>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-2">
                            {tasks.filter(t => !t.completed).map(task => (
                                <button
                                    key={task.id}
                                    onClick={() => handleSelectTask(task.id)}
                                    className="w-full text-left p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-colors group"
                                >
                                    <div className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                        {task.title}
                                    </div>
                                    {task.subject && (
                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                            {task.subject}
                                        </div>
                                    )}
                                </button>
                            ))}

                            {tasks.filter(t => !t.completed).length === 0 && (
                                <div className="text-center py-6 text-gray-400 text-sm">
                                    No active tasks found.
                                </div>
                            )}

                            <div className="border-t border-gray-100 dark:border-slate-700 my-2"></div>

                            <button
                                onClick={handleGeneralFocus}
                                className="w-full text-left p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-transparent hover:border-purple-200 dark:hover:border-purple-800 transition-colors group"
                            >
                                <div className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                                    🧠 General Learning
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Just focus without a specific task
                                </div>
                            </button>
                        </div>

                        <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-700">
                            <button
                                onClick={() => setShowTaskSelector(false)}
                                className="w-full py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Camera Paused Modal */}
            {showCameraPausedModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="text-5xl mb-4">📷</div>
                            <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100 mb-2">
                                Camera Required
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                                Your focus session is paused because the camera was turned off.
                                Enable the camera to resume, or finish your session now.
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => setShowCameraPausedModal(false)}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                                >
                                    📷 I'll Turn On Camera
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCameraPausedModal(false);
                                        handleFinishEarly();
                                    }}
                                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
                                >
                                    ✅ Finish Session Now
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCameraPausedModal(false);
                                        reset();
                                    }}
                                    className="w-full py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition-colors"
                                >
                                    Cancel Session
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Session Wizard Modal */}
            <SessionWizard
                isOpen={showSessionWizard}
                onClose={() => setShowSessionWizard(false)}
                sessionDuration={completedSessionDuration}
                sessionId={completedSessionId}
                taskId={completedTaskId}
            />
        </div>
    );
}
