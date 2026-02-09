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
import { SmartTimerModal } from './SmartTimerModal';

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

    // Webcam state - camera must be ready and face detected to start (if required)
    const { isReady: cameraReady, isFaceDetected, isEnabled: cameraEnabled } = useWebcamStore();
    const cameraRequirementMet = !settings.requireCamera || (cameraEnabled && cameraReady && isFaceDetected);
    const canStartFocus = cameraRequirementMet;

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

    // Camera enforcement: auto-pause when camera is disabled during focus (only if requireCamera is enabled)
    useEffect(() => {
        // If we're in focus mode, camera is required, and camera gets disabled, pause and show modal
        if (state === 'focus' && settings.requireCamera && !cameraEnabled) {
            pause();
            setShowCameraPausedModal(true);
        }
        // If camera is re-enabled while modal is showing, close it
        if (cameraEnabled && showCameraPausedModal) {
            setShowCameraPausedModal(false);
        }
    }, [state, cameraEnabled, pause, showCameraPausedModal, settings.requireCamera]);

    // SVG progress ring calculations
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    const getStateColor = () => {
        switch (state) {
            case 'focus': return 'text-focus';
            case 'break': return 'text-break';
            case 'paused': return 'text-paused';
            default: return 'text-stone-400';
        }
    };

    const getStateGradient = () => {
        switch (state) {
            case 'focus': return 'url(#gradient-focus)';
            case 'break': return 'url(#gradient-break)';
            case 'paused': return 'url(#gradient-paused)';
            default: return 'currentColor';
        }
    };

    const getStateGlow = () => {
        switch (state) {
            case 'focus': return 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.4))';
            case 'break': return 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.4))';
            case 'paused': return 'drop-shadow(0 0 12px rgba(234, 179, 8, 0.4))';
            default: return 'none';
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
    const [showSmartTimer, setShowSmartTimer] = useState(false);
    const [selectedTaskForAI, setSelectedTaskForAI] = useState<{ id: string; title: string; subject: string } | null>(null);

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

    const handleAITimerForTask = (task: { id: string; title: string; subject: string }) => {
        setSelectedTaskForAI(task);
        setShowSmartTimer(true);
    };

    const handleApplyAndStartTimer = (taskId: string) => {
        setShowSmartTimer(false);
        setShowTaskSelector(false);
        if (!canStartFocus) return;
        startFocus(taskId);
    };

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Progress Ring */}
            <div className="relative">
                <svg width="280" height="280" className="transform -rotate-90">
                    {/* Gradient Definitions */}
                    <defs>
                        <linearGradient id="gradient-focus" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="100%" stopColor="#f87171" />
                        </linearGradient>
                        <linearGradient id="gradient-break" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#22c55e" />
                            <stop offset="100%" stopColor="#4ade80" />
                        </linearGradient>
                        <linearGradient id="gradient-paused" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#eab308" />
                            <stop offset="100%" stopColor="#facc15" />
                        </linearGradient>
                    </defs>

                    {/* Background track */}
                    <circle
                        cx="140"
                        cy="140"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-stone-200 dark:text-stone-800"
                    />
                    {/* Progress ring with gradient */}
                    <circle
                        cx="140"
                        cy="140"
                        r={radius}
                        stroke={getStateGradient()}
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                        style={{
                            strokeDasharray: circumference,
                            strokeDashoffset,
                            filter: getStateGlow(),
                        }}
                    />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-5xl font-display font-bold tracking-tight ${getStateColor()}`}>
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-display font-semibold text-stone-500 dark:text-stone-400 mt-2 tracking-wide">
                        {getStateLabel()}
                    </span>
                    {(currentTaskId || currentTask) && (
                        <span className="text-xs text-accent-600 dark:text-accent-400 mt-2 max-w-[180px] truncate font-medium bg-accent-50 dark:bg-accent-900/30 px-3 py-1 rounded-full">
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
                            className={`px-8 py-3.5 font-display font-bold rounded-2xl transition-all duration-200 ${canStartFocus
                                ? 'bg-gradient-to-r from-focus to-focus-dark hover:shadow-glow-focus text-white shadow-lg hover:-translate-y-0.5'
                                : 'bg-stone-300 dark:bg-stone-700 text-stone-500 dark:text-stone-500 cursor-not-allowed'
                                }`}
                        >
                            Start Focus
                        </button>
                        {!canStartFocus && settings.requireCamera && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 text-center max-w-[220px] font-medium">
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
                            className="px-6 py-3 bg-gradient-to-r from-paused to-paused-dark hover:shadow-lg text-white font-display font-semibold rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
                        >
                            Pause
                        </button>
                        <button
                            onClick={skip}
                            className="px-6 py-3 bg-stone-500 hover:bg-stone-600 text-white font-display font-semibold rounded-2xl transition-all duration-200"
                        >
                            Break
                        </button>
                        <button
                            onClick={handleFinishEarly}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:shadow-lg hover:shadow-purple-500/30 text-white font-display font-semibold rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
                        >
                            Finish Learning
                        </button>
                    </div>
                )}

                {state === 'break' && (
                    <div className="flex gap-3">
                        <button
                            onClick={pause}
                            className="px-6 py-3 bg-gradient-to-r from-paused to-paused-dark hover:shadow-lg text-white font-display font-semibold rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
                        >
                            Pause
                        </button>
                        <button
                            onClick={skip}
                            className="px-6 py-3 bg-gradient-to-r from-break to-break-dark hover:shadow-glow-break text-white font-display font-semibold rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
                        >
                            Continue
                        </button>
                        <button
                            onClick={handleFinishEarly}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:shadow-lg hover:shadow-purple-500/30 text-white font-display font-semibold rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
                        >
                            Finish Learning
                        </button>
                    </div>
                )}

                {state === 'paused' && (
                    <div className="flex gap-3">
                        <button
                            onClick={resume}
                            className="px-6 py-3 bg-gradient-to-r from-break to-break-dark hover:shadow-glow-break text-white font-display font-semibold rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
                        >
                            Resume
                        </button>
                        <button
                            onClick={reset}
                            className="px-6 py-3 bg-stone-500 hover:bg-stone-600 text-white font-display font-semibold rounded-2xl transition-all duration-200"
                        >
                            Reset
                        </button>
                    </div>
                )}
            </div>

            {/* Task Selector Modal */}
            {showTaskSelector && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-stone-200 dark:border-stone-800 animate-scale-in">
                        <div className="p-5 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
                            <h3 className="font-display font-bold text-lg text-stone-800 dark:text-stone-100">
                                🎯 What are you learning?
                            </h3>
                            <p className="text-xs text-stone-500 mt-1">Select a task to track your focus session.</p>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
                            {tasks.filter(t => !t.completed).map(task => (
                                <button
                                    key={task.id}
                                    onClick={() => handleSelectTask(task.id)}
                                    className="w-full text-left p-4 rounded-2xl hover:bg-accent-50 dark:hover:bg-accent-900/20 border border-transparent hover:border-accent-200 dark:hover:border-accent-800 transition-all duration-200 group"
                                >
                                    <div className="font-display font-semibold text-stone-800 dark:text-stone-200 group-hover:text-accent-600 dark:group-hover:text-accent-400">
                                        {task.title}
                                    </div>
                                    {task.subject && (
                                        <div className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-accent-400"></span>
                                            {task.subject}
                                        </div>
                                    )}
                                </button>
                            ))}

                            {tasks.filter(t => !t.completed).length === 0 && (
                                <div className="text-center py-8 text-stone-400 text-sm">
                                    No active tasks found.
                                </div>
                            )}

                            <div className="border-t border-stone-100 dark:border-stone-800 my-2"></div>

                            <button
                                onClick={handleGeneralFocus}
                                className="w-full text-left p-4 rounded-2xl hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-transparent hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-200 group"
                            >
                                <div className="font-display font-semibold text-stone-800 dark:text-stone-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                                    🧠 General Learning
                                </div>
                                <div className="text-xs text-stone-500 mt-1">
                                    Just focus without a specific task
                                </div>
                            </button>
                        </div>

                        {/* AI Timer Button */}
                        <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-t border-purple-100 dark:border-purple-800">
                            <button
                                onClick={() => {
                                    const firstTask = tasks.filter(t => !t.completed)[0];
                                    if (firstTask) {
                                        handleAITimerForTask(firstTask);
                                    } else {
                                        handleAITimerForTask({ id: 'general', title: 'General Learning', subject: '' });
                                    }
                                }}
                                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-display font-bold rounded-2xl transition-all shadow-lg hover:shadow-purple-500/30 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                            >
                                <span>🤖</span>
                                <span>Get AI Timer Suggestion</span>
                            </button>
                            <p className="text-xs text-center text-stone-500 dark:text-stone-400 mt-2">
                                Let AI suggest optimal focus/break times
                            </p>
                        </div>

                        <div className="p-3 bg-stone-50 dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800">
                            <button
                                onClick={() => setShowTaskSelector(false)}
                                className="w-full py-2.5 text-sm font-display font-medium text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Camera Paused Modal */}
            {showCameraPausedModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-stone-200 dark:border-stone-800 animate-scale-in">
                        <div className="p-8 text-center">
                            <div className="text-6xl mb-5">📷</div>
                            <h3 className="font-display font-bold text-xl text-stone-800 dark:text-stone-100 mb-3">
                                Camera Required
                            </h3>
                            <p className="text-stone-500 dark:text-stone-400 text-sm mb-8">
                                Your focus session is paused because the camera was turned off.
                                Enable the camera to resume, or finish your session now.
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => setShowCameraPausedModal(false)}
                                    className="w-full py-3.5 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white font-display font-bold rounded-2xl transition-all duration-200 hover:-translate-y-0.5 shadow-lg"
                                >
                                    📷 I'll Turn On Camera
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCameraPausedModal(false);
                                        handleFinishEarly();
                                    }}
                                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-display font-bold rounded-2xl transition-all duration-200 hover:-translate-y-0.5 shadow-lg"
                                >
                                    ✅ Finish Session Now
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCameraPausedModal(false);
                                        reset();
                                    }}
                                    className="w-full py-2.5 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 text-sm font-display font-medium transition-colors"
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

            {/* Smart Timer Modal */}
            <SmartTimerModal
                isOpen={showSmartTimer}
                onClose={() => setShowSmartTimer(false)}
                prefilledTopic={selectedTaskForAI?.title}
                prefilledSubject={selectedTaskForAI?.subject}
                selectedTaskId={selectedTaskForAI?.id || null}
                onApplyAndStart={handleApplyAndStartTimer}
            />
        </div>
    );
}
