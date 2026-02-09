# FocusForge - Learning Focus App

A Tauri 2.0 desktop application designed to enhance learning through focused sessions, distraction tracking, AI-powered knowledge consolidation, and gamified motivation.

## Tech Stack

- **Frontend**: React + TypeScript + TailwindCSS
- **Backend**: Tauri 2.0 (Rust)
- **State**: Zustand with localStorage persistence
- **Database**: SQLite (Tauri SQL Plugin) + localStorage fallback
- **AI**: Google Gemini API (Gemini 3 Flash)
- **ML**: TensorFlow.js + MediaPipe (Face Detection)

---

## Features Implemented

### Core Timer System
- Pomodoro-style timer with configurable focus/break durations (default 25/5)
- Progress ring visualization with animated countdown
- States: Idle → Focus → Break → Paused
- System tray integration with live timer display
- Desktop + Pushover phone notifications

### 🤖 AI Timer Assistant (Gemini 3 Flash)
- **Dual Integration Points**:
  - Task Selector: AI button when starting focus sessions
  - Task Creation Form: AI button in task list for pre-planning
- **Context-Aware Suggestions**: Analyzes topic, complexity, learning style, energy level
- **Auto-fill**: Pre-fills task title and subject from current task context
- **Quick presets**: Standard (25/5), Deep Work (50/10), Light Review (15/3), Extended (45/8)
- **Smart Recommendations**: Varies suggestions based on context (not just default 25/5)
  - Advanced topics → 50-75 min sessions
  - Coding/creative → 45-60 min
  - Low energy → 15-20 min
  - Beginner → 20-30 min
- AI provides reasoning and personalized study tips
- **Robust Parsing**: Handles markdown blocks, comments, trailing commas in AI responses
- **Auto-start**: Applies settings and starts timer immediately

### Task Management
- CRUD operations with drag-and-drop reordering
- Priority levels (Today, This Week, Backlog)
- Subject/topic categorization
- "Continue Learning" for completed tasks

### Distraction Detection (Webcam)
- TensorFlow.js face detection with MediaPipe Face Mesh
- Eye gaze tracking (up/down/left/right/center)
- Auto-logs distraction after 10 seconds of looking away or absence
- Only logs during active focus sessions (not when paused)
- **Camera Enforcement**: Timer pauses if camera disabled during focus

### Auto Picture-in-Picture
- Camera feed enters PiP mode when switching to other apps
- Auto-exits PiP when returning to app

### Quick Notes System
- **Global shortcut**: `Ctrl+Alt+N` (works from any app during focus sessions)
- **Cross-window sync**: Tauri events for state sharing between windows
- **Task selector**: Choose which task to save notes to
- Focus mode requirement: Only available during focus/paused sessions
- Shortcut hint displayed in UI

### Deep Learning Workflow (Post-Session)
- **Active Recall**: Prompt to explain what you learned
- **AI Analysis**: Gemini compares recall vs notes, Socratic follow-ups
- **Master Summary**: AI consolidates session into key takeaways
- **Badge Checking**: Automatic achievement awards on session complete

### Learning History
- **Grouped by Task**: Sessions as expandable folders
- Session details modal with summary, notes, recall, chat log
- Scrollable notes section for long content
- Delete option for individual sessions
- Weekly distraction stats chart

### 🏆 Badges & Gamification
- **Stats Page**: Access via 🏆 button in header
- **11 Achievable Badges** across 3 categories:

| Category | Badges |
|----------|--------|
| 🔥 Streak | Spark (3d), Flame (7d), Blaze (30d) |
| 🎯 Focus | Laser Focus, Zen Master, Untouchable |
| 🏆 Milestone | First Steps, Scholar, Deep Diver, Night Owl, Early Bird |

- **Locked badges**: Displayed grayed with 🔒 icon
- **Auto-awarded**: Checked after each session completes

### 📊 Analytics Dashboard
- **Weekly Focus Chart**: Bar chart showing focus minutes per day (last 7 days)
- **Productivity Heatmap**: GitHub-style grid showing peak focus hours by day
- Quick stats: streak, total sessions, total time, tasks completed
- Weekly summary with distractions count and badges earned

---

## Architecture Highlights

### Cross-Window State Sync
- Timer state written to localStorage on state change
- Tauri events (`request-timer-state`, `timer-state-update`) for real-time sync
- Quick-note window receives state via events + localStorage fallback

### Data Persistence
- **SQLite**: Primary storage via `@tauri-apps/plugin-sql`
- **localStorage**: Fallback for browser-only dev
- **Zustand persist**: Automatic state hydration

---

## Key Files

| File | Purpose |
|------|---------|
| `src/components/Timer.tsx` | Main timer UI + AI button integration |
| `src/components/TaskList.tsx` | Task management + AI timer button |
| `src/components/SmartTimerModal.tsx` | AI-powered timer settings assistant |
| `src/components/WebcamDetector.tsx` | Face detection & PiP |
| `src/components/SessionWizard/` | Post-session AI flow |
| `src/components/HistoryPage.tsx` | Grouped session history |
| `src/components/StatsPage.tsx` | Stats & badges grid |
| `src/components/AnalyticsCharts.tsx` | Weekly focus & heatmap |
| `src/components/Badges.tsx` | Badge UI components |
| `src/stores/badgeStore.ts` | Badge definitions & check logic |
| `src/stores/timerStore.ts` | Timer state with sync |
| `src/QuickNoteWindow.tsx` | Global shortcut popup |
| `src-tauri/src/lib.rs` | Rust backend: tray, shortcuts, events |

---

## Commands

```bash
npm run dev         # Browser only (no Tauri)
npm run tauri dev   # Full desktop app
npm run tauri build # Production build
```

---

## Recent Updates (Dec 2024)

1. **AI Timer Assistant v2**: Task-integrated AI suggestions with dual entry points (task selector + task creation form)
2. **Smart Recommendations**: Context-aware timer durations based on topic complexity, learning style, energy level
3. **Robust AI Parsing**: Handles markdown blocks, comments, and truncated responses gracefully
4. **Analytics Dashboard**: Weekly focus chart + productivity heatmap
5. **Badges System**: 11 achievements across streak, focus, and milestone categories
6. **Stats Page**: Full dashboard with charts, badges, streak, sessions stats
7. **Learning History Redesign**: Sessions grouped by task as expandable folders
8. **Cross-Window Sync**: Tauri events for reliable state sharing
9. **Task Dropdown in Notes**: Select target task for notes
