import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { getSessionHistory, deleteSessionHistory, SessionHistoryItem } from '../lib/database';

interface TaskGroup {
    task_id: string;
    task_title: string;
    sessions: SessionHistoryItem[];
    totalDuration: number;
    sessionCount: number;
}

export function HistoryPage({ onBack }: { onBack: () => void }) {
    const [history, setHistory] = useState<SessionHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedTask, setExpandedTask] = useState<string | null>(null);
    const [selectedSession, setSelectedSession] = useState<SessionHistoryItem | null>(null);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const result = await getSessionHistory();
                setHistory(result);
            } catch (error) {
                console.error('Failed to load history:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadHistory();
    }, []);

    // Group sessions by task_id
    const taskGroups = useMemo(() => {
        const groups: Record<string, TaskGroup> = {};

        history.forEach(session => {
            const taskId = session.task_id || 'general';
            if (!groups[taskId]) {
                groups[taskId] = {
                    task_id: taskId,
                    task_title: session.task_title || (taskId === 'general' ? 'General Learning' : 'Unknown Task'),
                    sessions: [],
                    totalDuration: 0,
                    sessionCount: 0
                };
            }
            groups[taskId].sessions.push(session);
            groups[taskId].totalDuration += session.duration || 0;
            groups[taskId].sessionCount++;
        });

        // Sort sessions within each group by date (newest first)
        Object.values(groups).forEach(group => {
            group.sessions.sort((a, b) =>
                new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
            );
        });

        // Sort groups by most recent session
        return Object.values(groups).sort((a, b) => {
            const aLatest = new Date(a.sessions[0]?.started_at || 0).getTime();
            const bLatest = new Date(b.sessions[0]?.started_at || 0).getTime();
            return bLatest - aLatest;
        });
    }, [history]);

    const formatDate = (isoString: string) => {
        if (!isoString) return 'Unknown date';
        return new Date(isoString).toLocaleString();
    };

    const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this session? This cannot be undone.')) {
            await deleteSessionHistory(sessionId);
            setHistory(history.filter(h => h.id !== sessionId));
        }
    };

    const toggleTask = (taskId: string) => {
        setExpandedTask(expandedTask === taskId ? null : taskId);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                    ⬅️
                </button>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                    Learning History
                </h1>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : taskGroups.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p className="text-xl">No sessions recorded yet.</p>
                    <p className="text-sm mt-2">Complete a focus session to see your progress!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {taskGroups.map((group) => (
                        <div key={group.task_id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                            {/* Task Header - Clickable to expand */}
                            <div
                                onClick={() => toggleTask(group.task_id)}
                                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-lg transition-transform duration-200 ${expandedTask === group.task_id ? 'rotate-90' : ''}`}>
                                            ▶
                                        </span>
                                        <div>
                                            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                                                📚 {group.task_title}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {group.sessionCount} session{group.sessionCount !== 1 ? 's' : ''} • {Math.round(group.totalDuration)} min total
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Sessions List */}
                            {expandedTask === group.task_id && (
                                <div className="border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                                    {group.sessions.map((session) => (
                                        <div
                                            key={session.id}
                                            onClick={() => setSelectedSession(session)}
                                            className="p-4 border-b border-gray-100 dark:border-slate-700 last:border-b-0 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {formatDate(session.started_at)} • {Math.round(session.duration)} min
                                                        </span>
                                                        {session.master_summary && (
                                                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                                                                Summarized
                                                            </span>
                                                        )}
                                                    </div>
                                                    {session.master_summary && (
                                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                                                            {session.master_summary}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => handleDelete(session.id, e)}
                                                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ml-2"
                                                    title="Delete session"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            {selectedSession && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedSession(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                    {selectedSession.task_title || 'Session Details'}
                                </h2>
                                <button onClick={() => setSelectedSession(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="flex gap-4 text-sm text-gray-500 border-b border-gray-100 dark:border-slate-800 pb-4">
                                    <span>📅 {formatDate(selectedSession.started_at)}</span>
                                    <span>⏱️ {Math.round(selectedSession.duration)} minutes</span>
                                </div>

                                {selectedSession.master_summary && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">✨ Master Summary</h3>
                                        <div className="text-gray-700 dark:text-gray-300 leading-relaxed prose dark:prose-invert prose-sm max-w-none">
                                            <ReactMarkdown>{selectedSession.master_summary}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {selectedSession.notes && (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                                        <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">📝 Session Notes</h3>
                                        <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                                            {selectedSession.notes}
                                        </div>
                                    </div>
                                )}

                                {selectedSession.recall_text && (
                                    <div>
                                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">🧠 Your Active Recall</h3>
                                        <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl text-gray-600 dark:text-gray-400 italic">
                                            "{selectedSession.recall_text}"
                                        </div>
                                    </div>
                                )}

                                {selectedSession.chat_log && (
                                    <div>
                                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">💬 AI Chat Log</h3>
                                        <div className="space-y-3 bg-gray-50 dark:bg-slate-800 p-4 rounded-xl max-h-60 overflow-y-auto">
                                            {JSON.parse(selectedSession.chat_log).map((msg: any, i: number) => (
                                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[80%] p-2 rounded-lg text-sm ${msg.role === 'user'
                                                        ? 'bg-blue-500 text-white rounded-br-none'
                                                        : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-bl-none shadow'
                                                        }`}>
                                                        <div className="prose dark:prose-invert prose-sm max-w-none">
                                                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
