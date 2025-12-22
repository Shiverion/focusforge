// Database service for Tauri desktop app
// Falls back to localStorage when running in browser

import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

// Check if running in Tauri
const isTauri = () => {
    return typeof window !== 'undefined' && '__TAURI__' in window;
};

export async function initDatabase() {
    if (!isTauri()) {
        console.log('📦 Running in browser mode - using localStorage');
        return null;
    }

    try {
        db = await Database.load('sqlite:focusforge.db');
        console.log('📦 SQLite database connected');

        // Create tables if they don't exist
        await db.execute(`
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                subject TEXT,
                priority TEXT DEFAULT 'today',
                completed INTEGER DEFAULT 0,
                completed_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.execute(`
            CREATE TABLE IF NOT EXISTS distractions (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                session_id TEXT,
                duration INTEGER,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.execute(`
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                task_id TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.execute(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);

        await db.execute(`
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                task_id TEXT,
                duration INTEGER NOT NULL,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                completed INTEGER DEFAULT 0,
                interruptions INTEGER DEFAULT 0,
                notes TEXT
            )
        `);

        await db.execute(`
            CREATE TABLE IF NOT EXISTS session_outcomes (
                session_id TEXT PRIMARY KEY,
                user_recall TEXT,
                ai_feedback TEXT,
                chat_log TEXT,
                final_summary TEXT,
                notes TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(session_id) REFERENCES sessions(id)
            )
        `);

        // Add order_index column if it doesn't exist (migration)
        try {
            await db.execute('ALTER TABLE tasks ADD COLUMN order_index INTEGER DEFAULT 0');
            console.log('📦 Added order_index to tasks table');
        } catch (e) {
            // Ignore error if column already exists
        }

        // Add notes column to session_outcomes if it doesn't exist (migration)
        try {
            await db.execute('ALTER TABLE session_outcomes ADD COLUMN notes TEXT');
            console.log('📦 Added notes to session_outcomes table');
        } catch (e) {
            // Ignore error if column already exists
        }

        console.log('📦 Database tables initialized');
        return db;
    } catch (error) {
        console.error('📦 Database error:', error);
        return null;
    }
}



export interface Session {
    id: string;
    taskId: string;
    duration: number; // in minutes
    startedAt: string;
    endedAt: string;
    completed: boolean;
    interruptions: number;
    notes?: string;
}

export async function saveSession(session: Session) {
    // Try SQLite first
    if (db) {
        try {
            await db.execute(
                `INSERT INTO sessions (id, task_id, duration, started_at, ended_at, completed, interruptions, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [session.id, session.taskId, session.duration, session.startedAt, session.endedAt, session.completed ? 1 : 0, session.interruptions, session.notes || '']
            );
            console.log('📦 Saved session to SQLite:', session.id);
            return true;
        } catch (error) {
            console.error('Failed to save session to SQLite:', error);
        }
    }

    // Fallback to localStorage
    try {
        const key = 'focusforge-sessions';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(session);
        localStorage.setItem(key, JSON.stringify(existing));
        console.log('📦 Saved session to localStorage:', session.id);
        return true;
    } catch (error) {
        console.error('Failed to save session to localStorage:', error);
        return false;
    }
}

export interface SessionOutcome {
    sessionId: string;
    userRecall: string;
    aiFeedback: string;
    chatLog: string;
    finalSummary: string;
    notes?: string; // Session notes joined as text
}

export async function saveSessionOutcome(outcome: SessionOutcome) {
    // Try SQLite first
    if (db) {
        try {
            await db.execute(
                `INSERT INTO session_outcomes (session_id, user_recall, ai_feedback, chat_log, final_summary, notes)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [outcome.sessionId, outcome.userRecall, outcome.aiFeedback, outcome.chatLog, outcome.finalSummary, outcome.notes || '']
            );
            console.log('📦 Saved session outcome to SQLite');
            return true;
        } catch (error) {
            console.error('Failed to save outcome to SQLite:', error);
        }
    }

    // Fallback to localStorage
    try {
        const key = 'focusforge-session-outcomes';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(outcome);
        localStorage.setItem(key, JSON.stringify(existing));
        console.log('📦 Saved session outcome to localStorage');
        return true;
    } catch (error) {
        console.error('Failed to save outcome to localStorage:', error);
        return false;
    }
}

// Get session history (works with both SQLite and localStorage)
export interface SessionHistoryItem {
    id: string;
    started_at: string;
    duration: number;
    task_id: string;
    task_title?: string;
    master_summary: string | null;
    recall_text: string | null;
    chat_log: string | null;
    notes: string | null;
}

export async function getSessionHistory(): Promise<SessionHistoryItem[]> {
    // Try SQLite first
    if (db) {
        try {
            const query = `
                SELECT 
                    s.id, 
                    s.started_at, 
                    s.duration, 
                    s.task_id,
                    t.title as task_title,
                    so.final_summary as master_summary,
                    so.user_recall as recall_text,
                    so.chat_log,
                    so.notes
                FROM sessions s
                LEFT JOIN session_outcomes so ON s.id = so.session_id
                LEFT JOIN tasks t ON s.task_id = t.id
                ORDER BY s.started_at DESC
            `;
            return await db.select<SessionHistoryItem[]>(query);
        } catch (error) {
            console.error('Failed to load history from SQLite:', error);
        }
    }

    // Fallback to localStorage
    try {
        const sessions: Session[] = JSON.parse(localStorage.getItem('focusforge-sessions') || '[]');
        const outcomes: SessionOutcome[] = JSON.parse(localStorage.getItem('focusforge-session-outcomes') || '[]');
        const tasks = JSON.parse(localStorage.getItem('focusforge-tasks') || '{"state":{"tasks":[]}}');
        const taskList = tasks?.state?.tasks || [];

        const historyItems: SessionHistoryItem[] = sessions.map(session => {
            const outcome = outcomes.find(o => o.sessionId === session.id);
            const task = taskList.find((t: any) => t.id === session.taskId);
            return {
                id: session.id,
                started_at: session.startedAt,
                duration: session.duration,
                task_id: session.taskId,
                task_title: task?.title || (session.taskId === 'general' ? 'General Learning' : undefined),
                master_summary: outcome?.finalSummary || null,
                recall_text: outcome?.userRecall || null,
                chat_log: outcome?.chatLog || null,
                notes: outcome?.notes || null
            };
        });

        // Sort by date descending
        historyItems.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
        return historyItems;
    } catch (error) {
        console.error('Failed to load history from localStorage:', error);
        return [];
    }
}

// Delete a session from history
export async function deleteSessionHistory(sessionId: string): Promise<void> {
    if (isTauri() && db) {
        try {
            await db.execute('DELETE FROM sessions WHERE id = ?', [sessionId]);
            await db.execute('DELETE FROM session_outcomes WHERE session_id = ?', [sessionId]);
            console.log('🗑️ Session deleted from SQLite:', sessionId);
        } catch (error) {
            console.error('Failed to delete session from SQLite:', error);
        }
    }

    // Also delete from localStorage
    const storageKey = 'focusforge-sessions';
    const existing = localStorage.getItem(storageKey);
    if (existing) {
        try {
            const sessions = JSON.parse(existing);
            const filtered = sessions.filter((s: any) => s.id !== sessionId);
            localStorage.setItem(storageKey, JSON.stringify(filtered));
            console.log('🗑️ Session deleted from localStorage:', sessionId);
        } catch (error) {
            console.error('Failed to delete session from localStorage:', error);
        }
    }
}

export function getDatabase() {
    return db;
}

export function isUsingDatabase() {
    return db !== null;
}

// Helper to migrate localStorage to SQLite (run once)
export async function migrateFromLocalStorage() {
    if (!db) return;

    // Migrate tasks
    const tasksJson = localStorage.getItem('focusforge-tasks');
    if (tasksJson) {
        try {
            const data = JSON.parse(tasksJson);
            if (data.state?.tasks) {
                for (const task of data.state.tasks) {
                    await db.execute(
                        `INSERT OR IGNORE INTO tasks (id, title, subject, priority, completed, completed_at, created_at) 
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [task.id, task.title, task.subject, task.priority, task.completed ? 1 : 0, task.completedAt, task.createdAt]
                    );
                }
                console.log('📦 Migrated tasks to SQLite');
            }
        } catch (e) {
            console.error('Migration error:', e);
        }
    }

    // Migrate distractions
    const distractionsJson = localStorage.getItem('focusforge-distractions');
    if (distractionsJson) {
        try {
            const data = JSON.parse(distractionsJson);
            if (data.state?.distractions) {
                for (const d of data.state.distractions) {
                    await db.execute(
                        `INSERT OR IGNORE INTO distractions (id, type, session_id, duration, timestamp) 
                         VALUES (?, ?, ?, ?, ?)`,
                        [d.id, d.type, d.sessionId, d.duration, d.timestamp]
                    );
                }
                console.log('📦 Migrated distractions to SQLite');
            }
        } catch (e) {
            console.error('Migration error:', e);
        }
    }

    // Migrate notes
    const notesJson = localStorage.getItem('focusforge-notes');
    if (notesJson) {
        try {
            const data = JSON.parse(notesJson);
            if (data.state?.notes) {
                for (const note of data.state.notes) {
                    await db.execute(
                        `INSERT OR IGNORE INTO notes (id, content, task_id, created_at) 
                         VALUES (?, ?, ?, ?)`,
                        [note.id, note.content, note.taskId, note.createdAt]
                    );
                }
                console.log('📦 Migrated notes to SQLite');
            }
        } catch (e) {
            console.error('Migration error:', e);
        }
    }
}
