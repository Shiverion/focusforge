# 🎯 FocusForge

A Tauri 2.0 desktop app for focused learning with AI-powered session review, webcam distraction detection, and gamified badges.

![Tauri](https://img.shields.io/badge/Tauri-2.0-blue) ![React](https://img.shields.io/badge/React-18-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6) ![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### 🍅 Pomodoro Timer
- Configurable focus/break durations
- System tray integration with live countdown
- Desktop & phone (Pushover) notifications

### 📷 Webcam Distraction Detection
- TensorFlow.js + MediaPipe Face Mesh
- Tracks eye gaze direction
- Auto-logs distractions when looking away
- Picture-in-Picture when switching apps

### 📝 Quick Notes
- **Global shortcut**: `Ctrl+Alt+N` from any app
- Notes linked to sessions for AI context
- Task selector dropdown

### 🧠 AI-Powered Session Review
- Active recall prompts after focus sessions
- Gemini AI analyzes your learning
- Socratic dialogue with follow-up questions
- Auto-generated session summaries

### 📊 Analytics Dashboard
- Weekly focus time trend chart
- Productivity heatmap (peak hours)
- Streak tracking

### 🏆 Gamified Badges
| Category | Badges |
|----------|--------|
| 🔥 Streak | Spark (3d), Flame (7d), Blaze (30d) |
| 🎯 Focus | Laser Focus, Zen Master, Untouchable |
| 🏆 Milestone | First Steps, Scholar, Deep Diver, Night Owl, Early Bird |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Rust (for Tauri)
- [Gemini API Key](https://makersuite.google.com/app/apikey) (optional, for AI features)

### Installation

```bash
# Clone the repo
git clone https://github.com/Shiverion/focusforge.git
cd focusforge

# Install dependencies
npm install

# Run in development
npm run tauri dev

# Build for production
npm run tauri build
```

### Production Installers
After building, find installers at:
- **MSI**: `src-tauri/target/release/bundle/msi/focusforge_*.msi`
- **EXE**: `src-tauri/target/release/bundle/nsis/focusforge_*-setup.exe`

## ⚙️ Configuration

1. Launch the app
2. Click ⚙️ Settings
3. Enter your Gemini API key (for AI features)
4. Configure focus/break durations
5. Optional: Set up Pushover for phone notifications

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + TailwindCSS
- **Backend**: Tauri 2.0 (Rust)
- **State**: Zustand with localStorage persistence
- **Database**: SQLite + localStorage fallback
- **AI**: Google Gemini 3 Flash API
- **ML**: TensorFlow.js + MediaPipe

## 📁 Project Structure

```
src/
├── components/
│   ├── Timer.tsx           # Main timer UI
│   ├── WebcamDetector.tsx  # Face detection
│   ├── SessionWizard/      # Post-session AI flow
│   ├── StatsPage.tsx       # Analytics & badges
│   └── AnalyticsCharts.tsx # Charts
├── stores/                 # Zustand stores
├── lib/
│   ├── database.ts         # SQLite wrapper
│   └── gemini.ts           # AI integration
└── QuickNoteWindow.tsx     # Global shortcut popup

src-tauri/
├── src/lib.rs              # Rust backend
└── tauri.conf.json         # Tauri config
```

## 🤝 Contributing

Contributions welcome! Please open an issue first to discuss changes.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Made with ❤️ for focused learners**
