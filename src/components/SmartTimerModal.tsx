import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { suggestTimerSettings, TimerSuggestion, TimerSuggestionInput } from '../lib/gemini';

interface SmartTimerModalProps {
    isOpen: boolean;
    onClose: () => void;
    prefilledTopic?: string;      // Auto-fill from task.title
    prefilledSubject?: string;    // Auto-fill from task.subject
    selectedTaskId?: string | null; // Task to auto-start after applying
    onApplyAndStart?: (taskId: string) => void; // Callback to start timer
}

// Quick presets for common scenarios
const PRESETS = [
    { name: 'Standard', focus: 25, break: 5, emoji: '🍅' },
    { name: 'Deep Work', focus: 50, break: 10, emoji: '🧠' },
    { name: 'Light Review', focus: 15, break: 3, emoji: '📖' },
    { name: 'Extended', focus: 45, break: 8, emoji: '⚡' },
];

export function SmartTimerModal({ isOpen, onClose, prefilledTopic, prefilledSubject, selectedTaskId, onApplyAndStart }: SmartTimerModalProps) {
    const settings = useSettingsStore();

    // Form state - initialize with pre-filled values
    const [topic, setTopic] = useState(prefilledTopic || '');
    const [subtopics, setSubtopics] = useState(prefilledSubject || '');
    const [complexity, setComplexity] = useState<TimerSuggestionInput['complexity']>();
    const [learningStyle, setLearningStyle] = useState<TimerSuggestionInput['learningStyle']>();
    const [energyLevel, setEnergyLevel] = useState<TimerSuggestionInput['energyLevel']>();
    const [timeAvailable, setTimeAvailable] = useState<number | ''>('');

    // AI state
    const [isLoading, setIsLoading] = useState(false);
    const [suggestion, setSuggestion] = useState<TimerSuggestion | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Update form when pre-filled props change
    useEffect(() => {
        if (prefilledTopic) setTopic(prefilledTopic);
        if (prefilledSubject) setSubtopics(prefilledSubject);
    }, [prefilledTopic, prefilledSubject]);

    const handleGetSuggestion = async () => {
        if (!topic.trim()) {
            setError('Please enter a topic');
            return;
        }

        if (!settings.geminiApiKey) {
            setError('Please configure your Gemini API key in Settings first');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuggestion(null);

        try {
            const input: TimerSuggestionInput = {
                topic: topic.trim(),
                subtopics: subtopics.trim() || undefined,
                complexity,
                learningStyle,
                energyLevel,
                timeAvailable: timeAvailable ? Number(timeAvailable) : undefined,
            };

            const result = await suggestTimerSettings(input, settings.geminiApiKey);
            setSuggestion(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get suggestion');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplySuggestion = () => {
        if (suggestion) {
            settings.setDurations(suggestion.focusDuration, suggestion.breakDuration);
            // If task is selected and callback provided, auto-start timer
            if (selectedTaskId && onApplyAndStart) {
                onApplyAndStart(selectedTaskId);
            }
            onClose();
        }
    };

    const handleApplyPreset = (focus: number, breakTime: number) => {
        settings.setDurations(focus, breakTime);
        // If task is selected and callback provided, auto-start timer
        if (selectedTaskId && onApplyAndStart) {
            onApplyAndStart(selectedTaskId);
        }
        onClose();
    };

    const handleClose = () => {
        // Reset state on close
        setTopic('');
        setSubtopics('');
        setComplexity(undefined);
        setLearningStyle(undefined);
        setEnergyLevel(undefined);
        setTimeAvailable('');
        setSuggestion(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-scale-in border border-stone-200 dark:border-stone-800">
                {/* Header */}
                <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md z-10">
                    <h2 className="text-lg font-display font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                        <span>🤖</span> AI Timer Assistant
                    </h2>
                    <button onClick={handleClose} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
                        ✕
                    </button>
                </div>

                <div className="p-5 space-y-6">
                    {/* Quick Presets */}
                    <div>
                        <label className="block text-sm font-display font-semibold text-stone-700 dark:text-stone-300 mb-3">
                            Quick Presets
                        </label>
                        <div className="grid grid-cols-4 gap-3">
                            {PRESETS.map((preset) => (
                                <button
                                    key={preset.name}
                                    onClick={() => handleApplyPreset(preset.focus, preset.break)}
                                    className="flex flex-col items-center p-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-accent-400 dark:hover:border-accent-600 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-all duration-200 hover:-translate-y-0.5"
                                >
                                    <span className="text-2xl mb-1">{preset.emoji}</span>
                                    <span className="text-xs font-display font-bold text-stone-700 dark:text-stone-300">{preset.name}</span>
                                    <span className="text-[10px] text-stone-500 font-mono mt-1">{preset.focus}/{preset.break}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-stone-200 dark:border-stone-800"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-3 bg-white dark:bg-stone-900 text-stone-400 font-medium">or get custom suggestions</span>
                        </div>
                    </div>

                    {/* Topic Input */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-display font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                                What are you learning? <span className="text-accent-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g., Machine Learning, Spanish Grammar"
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 outline-none transition-all placeholder:text-stone-400"
                            />
                        </div>

                        {/* Subtopics */}
                        <div>
                            <label className="block text-sm font-display font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                                Specific subtopics (optional)
                            </label>
                            <input
                                type="text"
                                value={subtopics}
                                onChange={(e) => setSubtopics(e.target.value)}
                                placeholder="e.g., Neural Networks, Backpropagation"
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 outline-none transition-all placeholder:text-stone-400"
                            />
                        </div>

                        {/* Complexity & Learning Style */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-display font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                                    Complexity
                                </label>
                                <select
                                    value={complexity || ''}
                                    onChange={(e) => setComplexity(e.target.value as TimerSuggestionInput['complexity'] || undefined)}
                                    className="w-full px-3 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 outline-none transition-all"
                                >
                                    <option value="">Select...</option>
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-display font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                                    Learning Style
                                </label>
                                <select
                                    value={learningStyle || ''}
                                    onChange={(e) => setLearningStyle(e.target.value as TimerSuggestionInput['learningStyle'] || undefined)}
                                    className="w-full px-3 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 outline-none transition-all"
                                >
                                    <option value="">Select...</option>
                                    <option value="reading">📚 Reading</option>
                                    <option value="coding">💻 Coding</option>
                                    <option value="video">🎥 Video</option>
                                    <option value="mixed">🔀 Mixed</option>
                                </select>
                            </div>
                        </div>

                        {/* Energy Level */}
                        <div>
                            <label className="block text-sm font-display font-semibold text-stone-700 dark:text-stone-300 mb-2">
                                Energy Level
                            </label>
                            <div className="flex gap-3">
                                {(['low', 'medium', 'high'] as const).map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setEnergyLevel(level)}
                                        className={`flex-1 py-2.5 px-3 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 ${energyLevel === level
                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 shadow-sm'
                                            : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400'
                                            }`}
                                    >
                                        <span className="block text-xl mb-1">
                                            {level === 'low' ? '😴' : level === 'medium' ? '😊' : '⚡'}
                                        </span>
                                        <span className="block text-xs font-bold capitalize">{level}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Time Available */}
                        <div>
                            <label className="block text-sm font-display font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                                Time Available (minutes, optional)
                            </label>
                            <input
                                type="number"
                                value={timeAvailable}
                                onChange={(e) => setTimeAvailable(e.target.value ? parseInt(e.target.value) : '')}
                                placeholder="e.g., 120"
                                min={15}
                                max={480}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 outline-none transition-all placeholder:text-stone-400"
                            />
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Get Suggestion Button */}
                    <button
                        onClick={handleGetSuggestion}
                        disabled={isLoading || !topic.trim()}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-display font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5"
                    >
                        {isLoading ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <span>✨</span>
                                Get AI Suggestion
                            </>
                        )}
                    </button>

                    {/* Suggestion Result */}
                    {suggestion && (
                        <div className="p-5 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-900/10 dark:to-blue-900/10 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-4 animate-scale-in">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-display font-semibold text-stone-700 dark:text-stone-300">Recommended Settings</span>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-white dark:bg-stone-800 border border-purple-100 dark:border-purple-900 rounded-full text-sm font-bold text-purple-600 dark:text-purple-400">
                                        🎯 {suggestion.focusDuration}min
                                    </span>
                                    <span className="px-3 py-1 bg-white dark:bg-stone-800 border border-break-200 dark:border-break-900 rounded-full text-sm font-bold text-break-600 dark:text-break-400">
                                        ☕ {suggestion.breakDuration}min
                                    </span>
                                </div>
                            </div>

                            {suggestion.sessions && (
                                <p className="text-sm text-stone-600 dark:text-stone-400">
                                    💡 Suggested sessions: <strong className="text-stone-800 dark:text-stone-200">{suggestion.sessions}</strong>
                                </p>
                            )}

                            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                                {suggestion.reasoning}
                            </p>

                            {suggestion.tips && suggestion.tips.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Tips from Gemini</span>
                                    <ul className="text-xs text-stone-600 dark:text-stone-400 space-y-1.5">
                                        {suggestion.tips.map((tip, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="text-purple-500 mt-0.5">•</span>
                                                <span>{tip}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                onClick={handleApplySuggestion}
                                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-display font-bold rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5"
                            >
                                ✓ Apply These Settings
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-stone-200 dark:border-stone-800">
                    <button
                        onClick={handleClose}
                        className="w-full py-3 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl font-display font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
