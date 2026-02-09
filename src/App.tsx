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
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      // Only set up listeners if running in Tauri
      if (!('__TAURI__' in window)) return;

      try {
        unlisten = await listen('request-timer-state', () => {
          // Emit current timer state to all windows
          emit('timer-state-update', {
            state: timerState.state,
            currentTaskId: timerState.currentTaskId,
            currentSessionId: timerState.currentSessionId
          });
        });
      } catch (err) {
        console.warn('Failed to setup Tauri listener:', err);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [timerState.state, timerState.currentTaskId, timerState.currentSessionId]);

  const navItems = [
    { id: 'home' as const, icon: '🏠', label: 'Home' },
    { id: 'history' as const, icon: '📅', label: 'History' },
    { id: 'stats' as const, icon: '🏆', label: 'Stats' },
  ];

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-800 dark:text-stone-100 font-body">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 bg-noise pointer-events-none" />

      {/* Modals */}
      <QuickNoteModal isOpen={isOpen} onClose={closeModal} />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Header with glassmorphism */}
      <header className="sticky top-0 z-40 glass border-b border-stone-200/50 dark:border-stone-800/50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-500/20">
              <span className="text-xl">🎯</span>
            </div>
            <h1 className="text-xl font-display font-bold bg-gradient-to-r from-accent-500 to-accent-600 bg-clip-text text-transparent">
              FocusForge
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1 p-1 bg-stone-200/50 dark:bg-stone-800/50 rounded-xl">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${currentPage === item.id
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-soft'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                title={item.label}
              >
                <span className="flex items-center gap-2">
                  <span>{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </span>
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={openModal}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-display font-semibold text-sm shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all duration-200 hover:-translate-y-0.5"
              title="Quick Note (Ctrl+N)"
            >
              <span>📝</span>
              <span className="hidden sm:inline">Note</span>
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2.5 rounded-xl bg-stone-200/70 dark:bg-stone-800/70 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 transition-all duration-200"
              title="Settings"
            >
              ⚙️
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl bg-stone-200/70 dark:bg-stone-800/70 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 transition-all duration-200"
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content with animation */}
      <main className="relative max-w-6xl mx-auto px-4 py-8 pb-24">
        {currentPage === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            {/* Left Column - Focus Area */}
            <div className="flex flex-col items-center gap-6">
              {/* Timer + Distraction Counter Row */}
              <div className="flex items-start gap-6 w-full justify-center">
                <DistractionLogger />
                <Timer />
              </div>

              {/* Camera */}
              <WebcamDetector />
            </div>

            {/* Right Column - Tasks & Stats */}
            <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
              <TaskList />
              <WeeklyStatsChart />

              {/* Badge Showcase Card */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-display font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-2">
                    <span>🏆</span> Achievements
                  </h3>
                  <button
                    onClick={() => setCurrentPage('stats')}
                    className="text-xs font-medium text-accent-500 hover:text-accent-600 transition-colors"
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
          <div className="animate-fade-in">
            <HistoryPage onBack={() => setCurrentPage('home')} />
          </div>
        )}

        {currentPage === 'stats' && (
          <div className="animate-fade-in">
            <StatsPage onBack={() => setCurrentPage('home')} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 glass border-t border-stone-200/50 dark:border-stone-800/50 py-3">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center gap-2 text-sm text-stone-500 dark:text-stone-500">
          <span>📚</span>
          <span>Press</span>
          <kbd className="px-2 py-0.5 bg-stone-200 dark:bg-stone-800 rounded-md text-xs font-mono font-medium">
            Ctrl+Alt+N
          </kbd>
          <span>to add a learning note</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
