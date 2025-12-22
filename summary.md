# FocusForge - Learning Focus App

A Tauri 2.0 desktop application designed to enhance learning through focused sessions, distraction tracking, AI-powered knowledge consolidation, and gamified motivation.

## Tech Stack

- **Frontend**: React + TypeScript + TailwindCSS
- **Backend**: Tauri 2.0 (Rust)
- **State**: Zustand with localStorage persistence
- **Database**: SQLite (Tauri SQL Plugin) + localStorage fallback
- **AI**: Google Gemini API (2.5 Flash / 3 Pro)
- **ML**: TensorFlow.js + MediaPipe (Face Detection)

---

## Features Implemented

### Core Timer System
- Pomodoro-style timer with configurable focus/break durations (default 25/5)
- Progress ring visualization with animated countdown
- States: Idle → Focus → Break → Paused
- System tray integration with live timer display
- Desktop + Pushover phone notifications

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

### 🏆 Badges & Gamification (NEW)
- **Stats Page**: Access via 🏆 button in header
- **11 Achievable Badges** across 3 categories:

| Category | Badges |
|----------|--------|
| 🔥 Streak | Spark (3d), Flame (7d), Blaze (30d) |
| 🎯 Focus | Laser Focus, Zen Master, Untouchable |
| 🏆 Milestone | First Steps, Scholar, Deep Diver, Night Owl, Early Bird |

- **Locked badges**: Displayed grayed with 🔒 icon
- **Badge tooltips**: Show description and earn date
- **Auto-awarded**: Checked after each session completes

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
| `src/components/Timer.tsx` | Main timer UI |
| `src/components/WebcamDetector.tsx` | Face detection & PiP |
| `src/components/SessionWizard/` | Post-session AI flow |
| `src/components/HistoryPage.tsx` | Grouped session history |
| `src/components/StatsPage.tsx` | Stats & badges grid |
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

1. **Badges System**: 11 achievements across streak, focus, and milestone categories
2. **Stats Page**: Full dashboard with badges grid, streak, sessions, time stats
3. **Learning History Redesign**: Sessions grouped by task as expandable folders
4. **Cross-Window Sync**: Tauri events for reliable state sharing
5. **Task Dropdown in Notes**: Select target task for notes
6. **Focus Mode Enforcement**: Notes require active focus session
