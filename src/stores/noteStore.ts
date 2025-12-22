import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Note {
    id: string;
    content: string;
    taskId?: string;
    sessionId?: string;
    createdAt: Date;
    tags: string[];
}

interface NoteState {
    notes: Note[];
    addNote: (content: string, taskId?: string, sessionId?: string, tags?: string[]) => void;
    deleteNote: (id: string) => void;
    getNotesForTask: (taskId: string) => Note[];
    getRecentNotes: (limit?: number) => Note[];
    rehydrate: () => void;
}

export const useNoteStore = create<NoteState>()(
    persist(
        (set, get) => ({
            notes: [],

            addNote: (content, taskId, sessionId, tags = []) => set((state) => ({
                notes: [{
                    id: crypto.randomUUID(),
                    content,
                    taskId,
                    sessionId,
                    createdAt: new Date(),
                    tags,
                }, ...state.notes]
            })),

            deleteNote: (id) => set((state) => ({
                notes: state.notes.filter((n) => n.id !== id)
            })),

            getNotesForTask: (taskId) => {
                return get().notes.filter((n) => n.taskId === taskId);
            },

            getRecentNotes: (limit = 10) => {
                return get().notes.slice(0, limit);
            },

            // Force reload from localStorage (for cross-window sync)
            rehydrate: () => {
                const stored = localStorage.getItem('focusforge-notes');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        if (parsed.state?.notes) {
                            set({ notes: parsed.state.notes });
                            console.log('[NoteStore] Rehydrated', parsed.state.notes.length, 'notes');
                        }
                    } catch (e) {
                        console.error('[NoteStore] Rehydration failed:', e);
                    }
                }
            },
        }),
        {
            name: 'focusforge-notes',
        }
    )
);
