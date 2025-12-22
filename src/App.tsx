import { useState, useEffect } from 'react';
import { Timer } from './components/Timer';
import { TaskList } from './components/TaskList';
import { DistractionLogger } from './components/DistractionLogger';
import { QuickNoteModal, useQuickNote } from './components/QuickNote';
import { SettingsPanel } from './components/Settings';
import { WebcamDetector } from './components/WebcamDetector';
import { WeeklyStatsChart } from './components/WeeklyStatsChart';
import { HistoryPage } from './components/HistoryPage';
import { StatsPage } from './components/StatsPage';
import { BadgeShowcase } from './components/Badges';
import { listen, emit } from '@tauri-apps/api/event';
import { useTimerStore } from './stores/timerStore';


function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<'home' | 'history' | 'stats'>('home');
  const { isOpen, openModal, closeModal } = useQuickNote();
  const timerState = useTimerStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Listen for timer state requests from quick-note window
  useEffect(() => {
    const unlisten = listen('request-timer-state', () => {
      // Emit current timer state to all windows
      emit('timer-state-update', {
        state: timerState.state,
        currentTaskId: timerState.currentTaskId,
        currentSessionId: timerState.currentSessionId
      });
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [timerState.state, timerState.currentTaskId, timerState.currentSessionId]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 text-gray-800 dark:text-gray-100 transition-colors">
      {/* Modals */}
      <QuickNoteModal isOpen={isOpen} onClose={closeModal} />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            🎯 FocusForge
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={openModal}
              className="px-3 py-2 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium"
              title="Quick Note (Ctrl+N)"
            >
              📝 Note
            </button>
            <button
              onClick={() => setCurrentPage('home')}
              className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 ${currentPage === 'home' ? 'bg-gray-200 dark:bg-slate-600' : ''}`}
              title="Home"
            >
              🏠
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
              title="Settings"
            >
              ⚙️
            </button>
            <button
              onClick={() => setCurrentPage('history')}
              className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 ${currentPage === 'history' ? 'bg-gray-200 dark:bg-slate-600' : ''}`}
              title="View History"
            >
              📅
            </button>
            <button
              onClick={() => setCurrentPage('stats')}
              className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 ${currentPage === 'stats' ? 'bg-gray-200 dark:bg-slate-600' : ''}`}
              title="Stats & Badges"
            >
              🏆
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 pb-20">
        {currentPage === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Focus Area */}
            <div className="flex flex-col items-center gap-6">
              {/* Timer + Distraction Counter Row */}
              <div className="flex items-start gap-6 w-full justify-center">
                <DistractionLogger />
                <Timer />
              </div>

              {/* Camera - Bigger */}
              <WebcamDetector />
            </div>

            {/* Right Column - Tasks & Stats */}
            <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
              <TaskList />
              <WeeklyStatsChart />

              {/* Badge Showcase */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">🏆 Badges</h3>
                  <button
                    onClick={() => setCurrentPage('stats')}
                    className="text-xs text-blue-500 hover:text-blue-600"
                  >
                    View All →
                  </button>
                </div>
                <BadgeShowcase />
              </div>
            </div>
          </div>
        )}
        {currentPage === 'history' && (
          <HistoryPage onBack={() => setCurrentPage('home')} />
        )}
        {currentPage === 'stats' && (
          <StatsPage onBack={() => setCurrentPage('home')} />
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 py-2 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>📚 Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-slate-600 rounded text-xs">Ctrl+Alt+N</kbd> to add a learning note</p>
      </footer>
    </div>
  );
}

export default App;



