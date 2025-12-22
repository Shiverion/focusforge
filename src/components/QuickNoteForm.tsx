import { useState, useEffect } from 'react';

interface QuickNoteFormProps {
    onSave: (note: string) => void;
    onCancel: () => void;
    className?: string;
}

export function QuickNoteForm({ onSave, onCancel, className = '' }: QuickNoteFormProps) {
    const [note, setNote] = useState('');

    const handleSave = () => {
        if (!note.trim()) return;
        onSave(note.trim());
        setNote('');
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
            if (e.key === 'Enter' && e.ctrlKey) handleSave();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [note, onSave, onCancel]);

    return (
        <div className={`rotate-0 ${className}`}>
            <div className="p-4">
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What did you just learn? What's an important insight?"
                    className="w-full h-32 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                />
                <p className="text-xs text-gray-400 mt-2">
                    💡 Tip: Writing what you learned helps retention by 50%+
                </p>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={!note.trim()}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium rounded-lg"
                >
                    Save Note (Ctrl+Enter)
                </button>
            </div>
        </div>
    );
}
