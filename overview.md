# Project Overview 

## Project name (60 characters)
FocusForge - AI-Powered Learning Focus with Distraction Detection

## Elevator Pitch (200 characters)
A desktop Pomodoro app that uses Gemini 3 Flash to suggest optimal timer settings, provide Socratic learning dialogue, and consolidate knowledge—while webcam AI tracks your focus in real-time.

# Project Details

FocusForge transforms how students and self-learners maintain focus. Unlike simple timer apps, it deeply integrates **Gemini 3 Flash** across three key workflows:

1. **Smart Timer Suggestions**: Gemini analyzes your topic, complexity level, learning style, and energy to recommend customized Pomodoro durations—not just the standard 25/5.

2. **Post-Session Active Recall**: After each session, Gemini prompts you to explain what you learned, compares your recall against your notes, and engages in Socratic follow-up questions to deepen understanding.

3. **Knowledge Consolidation**: Gemini summarizes your session notes into key takeaways and generates review questions for future study.

The app also features **optional TensorFlow.js webcam distraction detection** using MediaPipe Face Mesh to track eye gaze direction, automatically logging distractions when you look away for more than 10 seconds. This feature can be enabled or disabled in Settings.

# Project Story

## Inspiration

As a lifelong learner constantly juggling online courses, certifications, and side projects, I struggled with two problems:

1. **Finding the right focus duration** - Pomodoro's standard 25/5 doesn't fit every task. Deep coding needs longer sessions; low-energy days need shorter ones.

2. **Remembering what I learned** - Taking notes is easy; retaining knowledge is hard. Without active recall practice, most information fades within days.

I realized these problems were perfect for AI. What if an assistant could understand my learning context and suggest optimal settings? What if it could quiz me after each session to cement knowledge?

## What it does

**Before Focus Sessions:**
- Describe your topic, complexity, learning style, and energy level
- Gemini 3 Flash analyzes context and suggests tailored timer settings (15-90 min focus, 3-20 min breaks)
- AI provides reasoning ("Advanced TypeScript concepts benefit from 50-minute deep work") and personalized study tips

**During Focus Sessions:**
- Webcam tracks your face using MediaPipe Face Mesh
- Eye gaze detection monitors if you're looking at the screen
- Auto-logs distractions after 10 seconds of looking away or absence
- Quick notes via global shortcut (Ctrl+Alt+N) from any app

**After Focus Sessions:**
- Active recall prompt: "What did you learn?"
- Gemini compares your recall vs. your notes
- Socratic follow-up questions to probe understanding
- AI-generated summary with key takeaways and review questions
- Gamified badges for streaks, focus quality, and milestones

## How we built it

**Frontend:** React + TypeScript + TailwindCSS for a modern, responsive UI with animated progress rings and smooth transitions.

**Desktop Runtime:** Tauri 2.0 (Rust) for native performance, system tray integration, and cross-window communication via events.

**AI Integration:** Direct calls to the Gemini 3 Flash API (`gemini-3-flash-preview`) with structured JSON prompts. Robust parsing handles markdown blocks, comments, and edge cases in AI responses.

**Machine Learning:** TensorFlow.js with MediaPipe Face Mesh for real-time face detection and eye gaze tracking, running entirely client-side.

**State Management:** Zustand with localStorage persistence, plus SQLite via Tauri's SQL plugin for session history.

**Key Architecture Decisions:**
- Cross-window state sync using Tauri events for the quick-note overlay
- Picture-in-Picture webcam mode when switching apps
- Fallback rule-based summarization when API is unavailable

## Challenges we ran into

1. **AI Response Parsing**: Gemini sometimes returns markdown code blocks, trailing commas, or comments in JSON. Built robust parsing with multiple fallback strategies.

2. **Eye Gaze Accuracy**: MediaPipe Face Mesh provides 468 landmarks. Correlating iris position with screen direction required careful threshold tuning.

3. **Cross-Window Communication**: Keeping timer state synced between main window and quick-note overlay required combining Tauri events with localStorage fallbacks.

4. **Context-Aware Suggestions**: Getting Gemini to provide varied recommendations (not just 25/5) required detailed prompts with research-backed guidelines.

## Accomplishments that we're proud of

- **AI that actually helps**: Timer suggestions feel genuinely personalized, not generic
- **Seamless integration**: Gemini appears at the right moments—task creation, session start, and session end
- **Real distraction accountability**: Webcam tracking makes you aware of focus patterns
- **Gamification that works**: Badges for streaks, focus quality, and milestones provide motivation
- **Production-ready**: Full desktop app with system tray, notifications, and persistent storage

## What we learned

1. **Prompt Engineering Matters**: Detailed, structured prompts with examples produce far better AI responses than vague instructions.

2. **AI Should Enhance, Not Replace**: The best AI features augment human decision-making rather than automating it entirely.

3. **Parsing AI Output is Hard**: Always expect edge cases—markdown blocks, incomplete JSON, unexpected formats.

4. **Desktop Apps Aren't Dead**: Tauri 2.0 makes building high-quality desktop apps with web technologies surprisingly pleasant.

## What's next for FocusForge

- **Spaced Repetition Integration**: Use Gemini to generate flashcards from session notes, scheduled using SM-2 algorithm
- **Team Accountability**: Share focus sessions with study groups
- **Mobile Companion**: Pushover notifications are just the start—full mobile integration planned
- **Voice Notes**: Whisper-based transcription for hands-free note-taking
- **Learning Analytics**: Historical insights on optimal focus times, best subjects, distraction patterns

### * Built with

**Languages:** TypeScript, Rust, HTML, CSS

**Frameworks:** React 18, Tauri 2.0, TailwindCSS

**AI/ML:** Google Gemini 3 Flash API, TensorFlow.js, MediaPipe Face Mesh

**State & Storage:** Zustand, SQLite, localStorage

**Notifications:** Pushover API, Desktop Notifications API

**Build Tools:** Vite, npm, Cargo (Rust)

**Platforms:** Windows, macOS, Linux (cross-platform via Tauri)
