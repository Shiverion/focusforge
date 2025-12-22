import { useState, useEffect, useCallback } from 'react';
import { useNoteStore } from '../stores/noteStore';
import { useTimerStore } from '../stores/timerStore';
import { useTaskStore } from '../stores/taskStore';

interface QuickNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
}

import { QuickNoteForm } from './QuickNoteForm';

export function QuickNoteModal({ isOpen, onClose }: QuickNoteModalProps) {
    const addNote = useNoteStore((s) => s.addNote);
    const { currentTaskId, currentSessionId, state } = useTimerStore();
    const tasks = useTaskStore((s) => s.tasks);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    // Default to current task when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedTaskId(currentTaskId);
        }
    }, [isOpen, currentTaskId]);

    const handleSave = (note: string) => {
        addNote(note, selectedTaskId || undefined, currentSessionId || undefined);
        onClose();
    };

    if (!isOpen) return null;

    const isFocusMode = state === 'focus' || state === 'paused';
    const incompleteTasks = tasks.filter(t => !t.completed);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        📝 Quick Note
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                    >
                        ✕
                    </button>
                </div>

                {isFocusMode ? (
                    <>
                        {/* Task Selector */}
                        <div className="px-4 pt-4">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                Save to task:
                            </label>
                            <select
                                value={selectedTaskId || ''}
                                onChange={(e) => setSelectedTaskId(e.target.value || null)}
                                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-800 dark:text-gray-200"
                            >
                                <option value="">Current Session (General)</option>
                                {incompleteTasks.map(task => (
                                    <option key={task.id} value={task.id}>
                                        {task.title} {task.id === currentTaskId ? '(Current)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <QuickNoteForm onSave={handleSave} onCancel={onClose} />
                        {/* Shortcut hint */}
                        <div className="px-4 pb-3 text-center">
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                💡 Tip: Use <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-slate-600 rounded text-xs font-mono">Ctrl+Alt+N</kbd> to open Quick Note from any app
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="p-6 text-center">
                        <div className="text-4xl mb-4">🍅</div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
                            Focus First!
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Start a focus session to take notes.
                        </p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export function useQuickNote() {
    const [isOpen, setIsOpen] = useState(false);

    const openModal = useCallback(() => setIsOpen(true), []);
    const closeModal = useCallback(() => setIsOpen(false), []);

    // Global keyboard shortcut: Ctrl+N
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                openModal();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [openModal]);

    return { isOpen, openModal, closeModal };
}

export function NotesList() {
    // Select the raw notes array (stable reference) and slice in component
    const allNotes = useNoteStore((s) => s.notes);
    const deleteNote = useNoteStore((s) => s.deleteNote);
    const notes = allNotes.slice(0, 5); // Get recent 5
    const [summary, setSummary] = useState<{ summary: string; keyPoints: string[]; reviewPrompt?: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSummarize = async () => {
        if (notes.length === 0) return;

        setLoading(true);
        try {
            // Get API key from settings store
            const { useSettingsStore } = await import('../stores/settingsStore');
            const apiKey = useSettingsStore.getState().geminiApiKey;

            if (!apiKey) {
                alert('Please add your Gemini API key in Settings first');
                return;
            }

            const { summarizeNotes } = await import('../lib/gemini');
            const result = await summarizeNotes(
                notes.map(n => n.content),
                apiKey
            );
            setSummary(result);
        } catch (error) {
            console.error('Summarization failed:', error);
            alert('Failed to summarize notes. Check your API key.');
        } finally {
            setLoading(false);
        }
    };

    if (notes.length === 0) return null;

    return (
        <div className="w-full max-w-md mt-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    📚 Recent Notes ({notes.length})
                </h3>
                <button
                    onClick={handleSummarize}
                    disabled={loading}
                    className="text-xs px-2 py-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded"
                >
                    {loading ? '⏳ Summarizing...' : '✨ AI Summary'}
                </button>
            </div>

            {/* AI Summary Card */}
            {summary && (
                <div className="p-4 mb-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h4 className="font-medium text-purple-700 dark:text-purple-400 mb-2">📋 Summary</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{summary.summary}</p>

                    <h5 className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Key Points:</h5>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc pl-4 mb-3">
                        {summary.keyPoints.map((point, i) => (
                            <li key={i}>{point}</li>
                        ))}
                    </ul>

                    {summary.reviewPrompt && (
                        <div className="p-2 bg-purple-100 dark:bg-purple-800/30 rounded text-sm">
                            <span className="font-medium">🧠 Test yourself:</span> {summary.reviewPrompt}
                        </div>
                    )}

                    <button
                        onClick={() => setSummary(null)}
                        className="mt-2 text-xs text-purple-500 hover:text-purple-600"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            <div className="space-y-2">
                {notes.map((note) => (
                    <div
                        key={note.id}
                        className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                    >
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {note.content}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                                {new Date(note.createdAt).toLocaleDateString()}
                            </span>
                            <button
                                onClick={() => deleteNote(note.id)}
                                className="text-xs text-red-400 hover:text-red-500"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
