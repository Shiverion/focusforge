# FocusForge – AI-Powered Focus Desktop App

## 🤖 CURSOR AGENT INSTRUCTIONS

**BEFORE implementing ANY feature, you MUST:**

1. **Propose 2-3 alternative approaches** with pros/cons:
   - Consider simpler solutions
   - Evaluate performance implications
   - Assess user experience impact
   - Compare development time

2. **Challenge assumptions:**
   - "Is this feature necessary for MVP?"
   - "What's the lightest implementation?"
   - "How does this fail gracefully?"
   - "What's the user friction?"

3. **Ask clarifying questions:**
   - Validate requirements before coding
   - Confirm technical stack decisions
   - Identify edge cases early

4. **Provide architectural recommendations:**
   - Suggest design patterns
   - Identify potential bottlenecks
   - Propose testing strategies

**Example interaction pattern:**
```
User: "Add webcam distraction detection"

Agent response:
"I recommend considering these approaches:

OPTION A: MediaPipe face mesh + object detection (original plan)
- Pros: Accurate, detailed signals
- Cons: Heavy CPU usage, complex integration, 2-3 week timeline
- Risk: Battery drain, false positives

OPTION B: Simple face presence detection
- Pros: Lightweight, 3-day timeline, reliable
- Cons: Less granular data
- Risk: Misses some distractions

OPTION C: Active window + idle time tracking (no camera)
- Pros: No privacy concerns, instant data, works on all devices
- Cons: Indirect signal, requires calibration
- Risk: False negatives

Which approach fits your goals? I can also suggest a hybrid approach."
```

**Always prioritize:**
- User privacy and consent
- Performance and battery life
- Graceful degradation
- Clear error handling
- Iterative development

---

## 1. Vision
FocusForge is a desktop productivity app designed to maximize deep work by:
- Structuring focus with Pomodoro cycles
- Detecting real distraction using behavioral signals
- Intervening intelligently via an AI focus agent
- Holding the user accountable without being intrusive

This app prioritizes behavior change over motivation hacks.

---

## 2. Core Principles
- Local-first & privacy-respecting
- Minimal UI, maximum intent
- AI supports decisions, does not replace logic
- Interventions are rare, short, and effective
- Graceful degradation (works without all features enabled)

---

## 3. MVP Features (Phases 1-2)

### 3.1 Pomodoro System (Phase 1, Week 1)
**Core functionality:**
- Customizable focus / break cycles (25/5 default)
- Session start, pause, reset, skip
- Visual timer with progress ring
- Soft audio notifications (optional)
- Local session history (SQLite)
- System tray integration

**Technical requirements:**
- Runs in background
- Low CPU usage (<1%)
- Persists state across app restarts
- Graceful handling of sleep/wake

**Cursor Agent: Before implementing, suggest:**
- Alternative timer visualization approaches
- State management patterns (Zustand vs Redux vs Context)
- Background service architecture options

---

### 3.2 Focus Session Declaration (Phase 1, Week 1-2)
**User flow:**
1. User enters task in text input
2. AI agent analyzes specificity
3. If vague → agent suggests 3 concrete alternatives
4. User selects or modifies
5. Session starts with committed task

**Example transformation:**
```
User: "Work on research"

AI Response (structured JSON):
{
  "is_specific": false,
  "suggestions": [
    "Read pages 15-20 of [paper name]",
    "Write 150 words on methodology section",
    "Annotate 5 references in bibliography"
  ],
  "reasoning": "Task is too broad for 25-minute session"
}
```

**Technical requirements:**
- OpenAI API with structured outputs
- Fallback to rule-based validation if API fails
- 3-second max response time
- Cost: ~$0.001 per task clarification
- Rate limiting to prevent API abuse

**Cursor Agent: Before implementing, suggest:**
- Prompt engineering strategies
- Fallback logic approaches
- Cost optimization techniques
- Alternative AI providers (Anthropic, local LLM)

---

### 3.3 Desktop Notifications (Phase 1, Week 2)
**Notification triggers:**
- Session completion
- Break reminder
- Optional mid-session check-in (15 min mark)
- Distraction detection (Phase 2+)

**Requirements:**
- Non-intrusive (no sound during focus unless opted-in)
- Actionable (buttons: Resume, Skip, End)
- Respects system notification settings
- Clear notification permission flow

**Cursor Agent: Before implementing, suggest:**
- Notification library options (tauri-plugin-notification vs native)
- Permission handling patterns
- A/B test different message tones

---

### 3.4 Session History & Basic Analytics (Phase 1, Week 2)
**Data collected:**
```sql
sessions (
  id, task_description, planned_duration, actual_duration,
  completed, interruptions, started_at, ended_at, notes
)

distractions (
  id, session_id, detection_type, timestamp, user_confirmed
)
```

**UI displays:**
- Today's focus time
- 7-day completion rate
- Most productive hours
- Common distraction patterns

**Privacy:**
- All data stored locally in SQLite
- Optional export to JSON
- No cloud sync in MVP

**Cursor Agent: Before implementing, suggest:**
- Database schema design
- Query optimization strategies
- Data visualization library options (Recharts vs Chart.js vs D3)

---

## 4. Advanced Features (Phase 2, Week 3-4)

### 4.1 Manual Distraction Logging
**Before automated detection, build manual tracking:**
- Quick "I got distracted" button in UI
- Optional reason selection (phone, social media, person, other)
- Timestamp and duration
- Integrates with analytics

**Why manual first:**
- Establishes baseline data
- Tests intervention logic
- Validates user engagement
- No privacy concerns

**Cursor Agent: Before implementing, suggest:**
- UI placement options (floating button vs system tray)
- Gamification approaches (streaks, rewards)
- Data insights that motivate usage

---

### 4.2 Active Window Detection (Alternative to Webcam)
**Approach:**
- Track foreground application name (not content)
- Detect rapid window switching (>5 switches/minute)
- Identify known distraction apps (browser, social media, games)
- All processing happens locally

**Technical:**
- Use platform-specific APIs (Win32 on Windows, NSWorkspace on macOS)
- No screenshot capture
- User configures distraction app list
- Optional whitelist mode (only allow work apps)

**Privacy advantages:**
- No camera required
- Less invasive than webcam
- Works on all devices
- Clear data being collected

**Cursor Agent: Before implementing, suggest:**
- Platform API comparison
- Accessibility permission handling
- App categorization strategies (manual vs automatic)

---

### 4.3 Optional Webcam Detection (Phase 3, Week 5+)
**Only implement if manual + window tracking proves insufficient**

**Simplified approach:**
- Use MediaPipe Face Detection only (not full mesh)
- Track: face present/absent, basic head pose
- Skip object detection (too heavy)
- Run inference max once per 5 seconds

**Detection logic:**
```
Distraction = 
  - Face absent for >30 seconds OR
  - Face present but looking away (>45° angle) for >20 seconds
  AND
  - Not during scheduled break
  AND
  - Cooldown period expired (5 min since last notification)
```

**Technical requirements:**
- Runs in worker thread
- GPU acceleration if available
- Battery saver mode (reduced frequency on battery)
- Clear visual indicator when active
- Instant disable button

**Privacy safeguards:**
- Explicit opt-in with clear explanation
- Show live preview of detection (dots on face)
- No frames stored or uploaded
- Processing happens in-memory only
- User can disable anytime without losing other features

**Cursor Agent: Before implementing, suggest:**
- CV library comparison (MediaPipe vs TensorFlow Lite)
- Performance benchmarking approach
- Alternative detection signals
- User testing methodology

---

### 4.4 AI Focus Agent Interventions

**Agent architecture:**
```javascript
// Agent receives context, not raw data
{
  "session": {
    "task": "Write methodology section",
    "elapsed": 12,
    "remaining": 13,
    "completion_status": "active"
  },
  "distraction": {
    "type": "phone_detected", // or "window_switching", "manual_log"
    "duration": 45,
    "count_today": 2
  },
  "history": {
    "avg_session_completion": 0.75,
    "distractions_trend": "increasing"
  }
}
```

**Agent generates:**
```json
{
  "intervention": {
    "message": "12 minutes in. Back to methodology.",
    "tone": "neutral", // neutral, firm, encouraging
    "channel": "desktop", // desktop, phone, none
    "escalate": false
  }
}
```

**Intervention rules:**
- Max 1 notification per 10-minute window
- Escalation after 3 distractions in one session
- No intervention in last 2 minutes (session ending anyway)
- Resets daily

**Cursor Agent: Before implementing, suggest:**
- Agent prompt engineering strategies
- Tone calibration approaches
- A/B testing framework for messages
- Escalation logic alternatives

---

### 4.5 Phone Push Notifications (Optional, Phase 3)
**Supported services:**
- Pushover (requires paid API, $5 one-time)
- Telegram Bot (free, requires setup)
- Native push (future: via companion app)

**Configuration:**
- Optional feature (desktop notifications work without it)
- Clear setup wizard
- Test notification before enabling
- Can disable per session

**Cursor Agent: Before implementing, suggest:**
- Service comparison (reliability, cost, setup friction)
- Fallback strategies if delivery fails
- Rate limiting approach

---

## 5. Technical Architecture

### 5.1 Stack Decisions

**Desktop Framework:**
- **Tauri 2.0** (Rust backend, small binary, native performance)
- Alternative considered: Electron (rejected: larger bundle, more memory)

**Frontend:**
- React 18 + TypeScript
- TailwindCSS (rapid styling)
- Framer Motion (minimal animations)
- Zustand (lightweight state management)

**Computer Vision (if needed):**
- MediaPipe Face Detection (lighter than full mesh)
- Run in Rust worker thread
- Alternative: TensorFlow Lite

**AI Integration:**
- Primary: OpenAI API (gpt-4o-mini for cost efficiency)
- Fallback: Rule-based logic (no API dependency)
- Future: Local LLM via Ollama

**Database:**
- SQLite (via Tauri plugin)
- No ORM (raw SQL for performance)

**Notifications:**
- tauri-plugin-notification (desktop)
- Pushover API (phone, optional)

### 5.2 Architecture Diagram
```
┌─────────────────────────────────────────┐
│           Frontend (React)              │
│  - Timer UI                             │
│  - Analytics Dashboard                  │
│  - Settings                             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Tauri Backend (Rust)               │
│  ┌────────────────────────────────────┐ │
│  │  Core Engine                       │ │
│  │  - Pomodoro State Machine          │ │
│  │  - Session Management              │ │
│  │  - SQLite Interface                │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Detection Service (Optional)      │ │
│  │  - Window Tracker                  │ │
│  │  - CV Worker Thread (if enabled)   │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  AI Agent Client                   │ │
│  │  - OpenAI API                      │ │
│  │  - Prompt Builder                  │ │
│  │  - Fallback Logic                  │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Notification Service              │ │
│  │  - Desktop Notifications           │ │
│  │  - Push Service (Pushover/Telegram)│ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 5.3 State Management
```typescript
// Zustand store structure
interface AppStore {
  // Timer state
  session: {
    isActive: boolean;
    isPaused: boolean;
    task: string;
    duration: number;
    elapsed: number;
    type: 'focus' | 'break';
  };
  
  // Settings
  settings: {
    focusDuration: number;
    breakDuration: number;
    enableWebcam: boolean;
    enablePushNotifications: boolean;
    distractionApps: string[];
  };
  
  // Analytics
  stats: {
    todayFocusTime: number;
    weeklyCompletion: number;
    distractionCount: number;
  };
}
```

**Cursor Agent: Before implementing, review:**
- State normalization strategies
- Persistence approach (localStorage vs Tauri store)
- Performance optimization for frequent updates

---

## 6. Privacy & Ethics

### 6.1 Non-Negotiables
✅ Webcam frames processed in-memory only
✅ No video recording or image storage
✅ No data uploaded to cloud (except optional API calls)
✅ Explicit opt-in with clear privacy explanation
✅ Visual indicator when webcam is active
✅ Instant disable without losing functionality

### 6.2 Privacy UI/UX
- First-run privacy explainer (not just buried in settings)
- Show exactly what data is collected
- Granular permissions (webcam, window tracking, notifications)
- "Privacy Dashboard" showing all data collected
- One-click data export and deletion

### 6.3 Ethical Considerations
- Avoid shame-based language ("You failed again")
- No dark patterns (can't make notifications too annoying)
- Transparent about AI decision-making
- User always in control

**Cursor Agent: Before any privacy-sensitive feature, validate:**
- Minimum data needed
- User consent flow
- Data deletion capability
- Transparency in UI

---

## 7. Revised Milestones

### Phase 1: Core Experience (Week 1-2)
**Goal:** Validate core loop (task → focus → complete)

- [ ] Tauri project setup
- [ ] Pomodoro timer engine
- [ ] System tray integration
- [ ] SQLite session storage
- [ ] Basic UI (timer, task input, history)
- [ ] AI task clarification (with fallback)
- [ ] Desktop notifications

**Success criteria:**
- Can complete 3 focus sessions in a row
- Task clarification feels helpful
- App runs smoothly in background

---

### Phase 2: Behavioral Tracking (Week 3-4)
**Goal:** Understand distraction patterns

- [ ] Manual distraction logging
- [ ] Active window detection
- [ ] Analytics dashboard (completion rate, focus time, patterns)
- [ ] Basic intervention logic (desktop notifications on distraction)
- [ ] Settings panel (timer duration, notification preferences)

**Success criteria:**
- Users log distractions voluntarily
- Analytics provide actionable insights
- 60%+ session completion rate

---

### Phase 3: Automated Detection (Week 5-6, Optional)
**Goal:** Reduce friction in distraction logging

- [ ] Simplified webcam detection (face presence only)
- [ ] Intelligent intervention (AI agent decides tone/timing)
- [ ] Phone push notifications (Pushover integration)
- [ ] Escalation system
- [ ] User feedback loop (mark false positives)

**Success criteria:**
- Detection accuracy >80%
- False positive rate <10%
- Users prefer automated over manual

---

## 8. Success Metrics

### MVP (Phase 1-2)
- 70%+ session completion rate
- 3+ sessions per day average
- Users complete at least 1 concrete task daily
- <5% churn after week 1

### Full Product (Phase 3)
- 80%+ session completion rate
- Distraction frequency decreases over 2 weeks
- Users report increased deep work time
- <2% false positive rate on detection

### Leading Indicators
- Task clarification used 80%+ of sessions
- Manual distraction logging used voluntarily
- Users customize settings (engaged)

---

## 9. Risk Mitigation

### Technical Risks
| Risk | Mitigation |
|------|------------|
| Webcam integration complexity | Start without it, add later if needed |
| API costs too high | Use cheaper models, aggressive caching |
| Battery drain | Run CV max once per 5s, skip on battery mode |
| Tauri + MediaPipe integration | Budget extra week, have Electron fallback |

### Product Risks
| Risk | Mitigation |
|------|------------|
| Feels invasive | Extreme transparency, granular controls |
| Users ignore notifications | A/B test messages, adaptive timing |
| Too complex to set up | Ship with smart defaults, optional features |
| Not effective vs. distractions | Manual logging proves value first |

---

## 10. Development Workflow

### With Cursor IDE:
1. **Start with architecture discussion**
   - Agent proposes alternatives
   - Validate approach before coding

2. **Iterative feature development**
   - Build smallest working version
   - Test with real usage
   - Iterate based on friction

3. **Continuous validation**
   - Ask "Is this necessary?"
   - Simplify wherever possible
   - Ship incomplete over perfect

4. **Testing strategy**
   - Manual testing during development
   - Record real usage sessions
   - Get feedback from 3-5 early users before next phase

---

## 11. Future Vision (Post-MVP)

### Potential Features (prioritize based on data)
- Voice-based focus check-ins ("What are you working on?")
- Adaptive Pomodoro (learns optimal duration)
- Focus insights powered by GPT-4 analysis
- Co-working sessions (virtual focus rooms)
- Integration with task managers (Todoist, Linear)
- Focus music integration (lo-fi generator)
- "Deep Work" mode (blocks all notifications)

**Cursor Agent: For each future feature, first answer:**
- Does data show users need this?
- What's the simplest version?
- What's the alternative to building it?

---

## 12. Open Questions (For Cursor Agent)

**Before starting development, discuss:**

1. **Should we start with Electron instead of Tauri?**
   - Tauri is newer, less documented, especially for CV
   - Electron has more resources but larger bundle
   - What's the true MVP timeline difference?

2. **Is webcam detection necessary at all?**
   - Can window tracking + manual logging provide 80% of value?
   - What would convince you webcam is worth the complexity?

3. **Local LLM vs. OpenAI API?**
   - Ollama is private but slow (3-10s responses)
   - OpenAI is fast but costs $0.001/request (~$3/month per user)
   - Hybrid approach: local for simple, API for complex?

4. **Should MVP include AI at all?**
   - Rule-based task validation could work
   - Interventions could be pre-written templates
   - AI adds cost and latency

**Answer these before writing code.**

---

## 📝 Next Steps

1. **Cursor Agent: Review this entire plan**
   - Challenge assumptions
   - Propose alternative architectures
   - Identify risks we missed

2. **Prioritize Phase 1 features**
   - What can be cut and still validate core loop?

3. **Prototype core loop in 2 days**
   - Timer + task input + simple logging
   - Manual testing

4. **Validate then expand**
   - Get real usage data before building complexity

---

**Remember: The best productivity app is the one people actually use. Simple > powerful.**