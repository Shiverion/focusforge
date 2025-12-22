# FocusForge - Next Features & Enhancements

## Priority 1: Quick Wins (1-2 hours each)

### Quick Distraction Logger from Tray
- Add tray menu item to log manual distraction
- One-click logging without opening main window
- Show toast notification on log

### Weekly Distraction Charts
- Add chart to History page showing distractions by day
- Color-coded by distraction type
- Trend line for improvement tracking

### Sound Notifications
- Play sound when timer ends (focus/break)
- Configurable sound options in Settings
- Enable/disable toggle

---

## Priority 2: Medium Effort (Half day each)

### Analytics Dashboard
- Today's total focus time
- 7-day completion rate chart
- Most productive hours heatmap
- Streak tracking (days in a row with completed sessions)

### Settings Panel Enhancements
- Long break duration (every 4 sessions)
- Auto-start next timer option
- Notification preferences granular control
- Data export (JSON/CSV)
- Data delete (clear all history)

### Keyboard Shortcuts
- `Space` to pause/resume
- `S` to skip
- `F` to finish learning
- Show shortcuts help modal

---

## Priority 3: Advanced Features (1-2 days each)

### Active Window Detection
- Detect when user switches to distraction apps (social media, games)
- Configurable app whitelist/blacklist
- Auto-pause or alert when distraction detected
- Platform-specific: Windows (win32api), macOS (NSWorkspace)

### Intervention System
- Notification throttling (1 per 10 minutes)
- Escalation after repeated distractions
- Popup reminder modal
- Optional phone call via Twilio for extreme cases

### Spaced Repetition Integration
- Schedule review reminders for past sessions
- "Review this topic in 3 days" suggestions
- Anki-style flashcard generation from summaries

### Multi-Device Sync
- Cloud sync via Firebase/Supabase
- Session history across devices
- Settings sync

---

## Priority 4: Polish & UX

### Onboarding Flow
- First-time setup wizard
- Camera permission request
- API key setup guidance
- Quick tour of features

### Theme Customization
- Multiple color themes
- Custom accent colors
- Font size options

### Mobile Companion App
- React Native or Flutter
- View session history
- Receive push notifications
- Quick distraction logging

---

## Bugs & Tech Debt

- [ ] Test end-to-end flow in Tauri production build
- [ ] Add error boundaries for API failures
- [ ] Optimize TensorFlow model loading (lazy load)
- [ ] Add unit tests for stores and database functions
- [ ] Improve accessibility (ARIA labels, keyboard nav)
