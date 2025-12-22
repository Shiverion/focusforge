import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTimerStore } from '../../stores/timerStore';
import { useNoteStore } from '../../stores/noteStore';
import { useTaskStore } from '../../stores/taskStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { AIChat } from '../AIChat';
import { chatWithAI, ChatMessage } from '../../lib/gemini';
import { saveSessionOutcome, getSessionHistory } from '../../lib/database';
import { useBadgeStore } from '../../stores/badgeStore';
import { useDistractionStore } from '../../stores/distractionStore';

interface SessionWizardProps {
    isOpen: boolean;
    onClose: () => void;
    sessionDuration: number;
    sessionId?: string | null;
    taskId?: string | null;
}

type WizardStep = 'recall' | 'analysis' | 'chat' | 'summary';

export function SessionWizard({ isOpen, onClose, sessionDuration, sessionId, taskId }: SessionWizardProps) {
    const [step, setStep] = useState<WizardStep>('recall');
    const [recallText, setRecallText] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [summary, setSummary] = useState('');
    const [markTaskComplete, setMarkTaskComplete] = useState(false);

    const { currentTaskId: storeTaskId, currentSessionId: storeSessionId } = useTimerStore();

    // Prefer props (captured before reset) over store (which might be reset)
    const currentTaskId = taskId ?? storeTaskId;
    const currentSessionId = sessionId ?? storeSessionId;
    const tasks = useTaskStore(s => s.tasks);
    const toggleComplete = useTaskStore(s => s.toggleComplete);
    const notes = useNoteStore(s => s.notes);
    const rehydrateNotes = useNoteStore(s => s.rehydrate);
    const geminiApiKey = useSettingsStore(s => s.geminiApiKey);

    // Rehydrate notes from localStorage when wizard opens (cross-window sync)
    useEffect(() => {
        if (isOpen) {
            rehydrateNotes();
        }
    }, [isOpen, rehydrateNotes]);

    // Get context
    const currentTask = tasks.find(t => t.id === currentTaskId);
    const sessionNotes = notes.filter(n =>
        (currentSessionId && n.sessionId === currentSessionId) ||
        (currentTaskId && n.taskId === currentTaskId && new Date(n.createdAt).getTime() > Date.now() - sessionDuration * 60 * 1000)
    ).map(n => n.content);

    console.log('[SessionWizard] Debug:', {
        currentSessionId,
        currentTaskId,
        sessionDuration,
        allNotes: notes.map(n => ({ content: n.content.substring(0, 30), sessionId: n.sessionId, taskId: n.taskId })),
        matchedNotes: sessionNotes
    });

    // Initial Analysis (Recall vs Notes)
    const handleRecallSubmit = async () => {
        if (!recallText.trim()) return;
        setStep('analysis');

        // System Prompt for Analysis
        const context = `
Task: ${currentTask?.title || 'General Learning'}
Subject: ${currentTask?.subject || 'N/A'}
Session Notes:
${sessionNotes.length > 0 ? sessionNotes.join('\n') : '(No notes taken)'}

User Recall:
"${recallText}"
        `.trim();

        const systemPrompt = `
You are a friendly Socratic Tutor.
Analyze the user's recall against their session notes and task.
1. Identify gaps between what they noted and what they recalled.
2. If notes are missing, focus on the depth of their recall.
3. Ask ONE thought-provoking question to deepen their understanding.
Keep the tone encouraging.
        `;

        try {
            const response = await chatWithAI([], context, geminiApiKey, systemPrompt);
            setChatHistory([
                { role: 'model', text: response }
            ]);
            setStep('chat');
        } catch (e) {
            console.error(e);
            // Fallback for error
            setChatHistory([{ role: 'model', text: "Great job on your session! What was the most interesting thing you learned?" }]);
            setStep('chat');
        }
    };

    // Chat Handler
    const handleSendMessage = async (text: string) => {
        const newHistory = [...chatHistory, { role: 'user', text } as ChatMessage];
        setChatHistory(newHistory);
        setIsChatLoading(true);

        try {
            const response = await chatWithAI(newHistory, text, geminiApiKey);
            setChatHistory([...newHistory, { role: 'model', text: response }]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleFinish = async () => {
        setStep('summary');

        const fullContext = `
Task: ${currentTask?.title || 'General Learning'}
Session Notes: ${sessionNotes.join('\n')}
User Recall: ${recallText}
Chat Log:
${chatHistory.map(m => m.role + ': ' + m.text).join('\n')}
        `.trim();

        try {
            // 1. Generate Master Summary
            const summary = await chatWithAI(
                [],
                `Please provide a concise "Master Summary" of this learning session.
Combine the user's initial recall, their notes, and the insights from our chat.
Focus on the key takeaways. Max 3 sentences.`,
                geminiApiKey,
                "You are an expert summarizer. Context:\n" + fullContext
            );

            setSummary(summary);

            // 2. Save to Database
            if (currentSessionId) {
                await saveSessionOutcome({
                    sessionId: currentSessionId,
                    userRecall: recallText,
                    aiFeedback: chatHistory.length > 0 ? chatHistory[0].text : 'No feedback',
                    chatLog: JSON.stringify(chatHistory),
                    finalSummary: summary,
                    notes: sessionNotes.join('\n\n---\n\n')
                });
            }

            // 3. Check and award badges
            await checkAndAwardBadges();

            // Allow user to read summary before closing
        } catch (e) {
            console.error('Summary failed', e);
            setSummary("Great session! (Summary generation failed)");
        }
    };

    // Badge checking logic
    const checkAndAwardBadges = async () => {
        const { checkStreakBadges, checkFocusBadges, checkMilestoneBadges } = useBadgeStore.getState();
        const { distractions } = useDistractionStore.getState();

        try {
            // Get session history for streak calculation
            const history = await getSessionHistory();
            const sessionDates = history.map(s => new Date(s.started_at));

            // Check streak badges
            checkStreakBadges(sessionDates);

            // Calculate distraction counts per session (simplified: use today's count)
            const todayDistractions = distractions.filter(d =>
                new Date(d.timestamp).toDateString() === new Date().toDateString()
            ).length;
            checkFocusBadges([todayDistractions]);

            // Check milestone badges
            const completedTasks = tasks.filter(t => t.completed).length;
            const totalMinutes = history.reduce((acc, s) => acc + (s.duration || 0), 0);
            const currentHour = new Date().getHours();
            checkMilestoneBadges(completedTasks, totalMinutes, currentHour);

            console.log('[SessionWizard] Badge check completed');
        } catch (e) {
            console.error('[SessionWizard] Badge check failed:', e);
        }
    };

    const handleCloseFinal = () => {
        if (markTaskComplete && currentTaskId) {
            toggleComplete(currentTaskId);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h2 className="font-bold text-lg">
                            {step === 'recall' && '🧠 Active Recall'}
                            {step === 'analysis' && '🤔 Analyzing...'}
                            {step === 'chat' && '💬 Deep Dive'}
                            {step === 'summary' && '📝 Consolidating'}
                        </h2>
                        <p className="text-xs opacity-80">
                            {sessionDuration ? `${Math.round(sessionDuration)}m focus session complete` : 'Session complete'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">✕</button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden p-6 relative">
                    {/* Step 1: Recall */}
                    {step === 'recall' && (
                        <div className="h-full flex flex-col animate-in slide-in-from-right duration-300">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                                What stuck with you?
                            </h3>
                            <p className="text-gray-500 mb-4 text-sm">
                                Don't look at your notes yet. Testing your memory reinforces learning by 50%.
                            </p>
                            <textarea
                                value={recallText}
                                onChange={(e) => setRecallText(e.target.value)}
                                placeholder="I learned that..."
                                className="flex-1 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl p-4 resize-none focus:ring-2 focus:ring-blue-500 outline-none text-base"
                                autoFocus
                            />
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={handleRecallSubmit}
                                    disabled={!recallText.trim()}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all flex items-center gap-2"
                                >
                                    Analyze Learning ✨
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Analysis (Loading) */}
                    {step === 'analysis' && (
                        <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in">
                            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                                Connecting the dots...
                            </h3>
                            <p className="text-gray-500 max-w-xs">
                                Comparing your recall with your notes on "{currentTask?.title || 'this topic'}"
                            </p>
                        </div>
                    )}

                    {/* Step 3: Chat */}
                    {step === 'chat' && (
                        <div className="h-full flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">
                            <div className="flex-1 overflow-hidden">
                                <AIChat
                                    messages={chatHistory}
                                    onSendMessage={handleSendMessage}
                                    isLoading={isChatLoading}
                                    className="h-full"
                                    placeholder="Reply to your AI tutor..."
                                />
                            </div>
                            <div className="mt-4 flex justify-between items-center border-t border-gray-100 dark:border-slate-700 pt-4 shrink-0">
                                <p className="text-xs text-gray-400">
                                    Chat to deepen your understanding.
                                </p>
                                <button
                                    onClick={handleFinish}
                                    className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm"
                                >
                                    Finish & Save Session
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Final Summary */}
                    {step === 'summary' && (
                        <div className="h-full flex flex-col animate-in fade-in justify-center items-center text-center p-4">
                            {!summary ? (
                                <>
                                    <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-100">Creating Master Summary...</h3>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-4">
                                        Session Consolidated! 🚀
                                    </h3>
                                    <div className="bg-gray-50 dark:bg-slate-700/50 p-6 rounded-xl border border-gray-100 dark:border-slate-600 w-full max-w-lg mb-6 text-left max-h-[40vh] overflow-y-auto">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 sticky top-0 bg-gray-50 dark:bg-slate-700/50 pb-2">Master Summary</h4>
                                        <div className="text-gray-800 dark:text-gray-100 leading-relaxed prose dark:prose-invert prose-sm max-w-none">
                                            <ReactMarkdown>{summary}</ReactMarkdown>
                                        </div>
                                    </div>

                                    {currentTaskId && (
                                        <div className="flex items-center gap-3 mb-6 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm cursor-pointer" onClick={() => setMarkTaskComplete(!markTaskComplete)}>
                                            <div className={`w-5 h-5 rounded border border-gray-300 dark:border-slate-500 flex items-center justify-center transition-colors ${markTaskComplete ? 'bg-green-500 border-green-500' : ''}`}>
                                                {markTaskComplete && <span className="text-white text-xs">✓</span>}
                                            </div>
                                            <span className="text-gray-700 dark:text-gray-200 text-sm font-medium select-none">Mark task as complete</span>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleCloseFinal}
                                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 transform transition-all hover:scale-105"
                                    >
                                        Complete Session
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
