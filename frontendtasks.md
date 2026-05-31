# TASKS.md — CourtVision AI Frontend

## Stack
- React + Tailwind CSS
- react-markdown (for rendering AI responses)
- Vite for build

## Design Direction
- **Dark sports dashboard** — think ESPN app meets Bloomberg terminal
- Background: `#0a0a0f` (near black) with subtle `#111118` card backgrounds
- Accent: `#f97316` (orange-500) — basketball orange, used for CTAs, active states, team A
- Secondary accent: `#3b82f6` (blue-500) — used for team B, sources, secondary info
- Text: `#f1f5f9` (slate-100) primary, `#94a3b8` (slate-400) secondary
- Cards: `#111118` background, `1px border border-white/5`, `rounded-xl`
- Font: system sans-serif, monospace for scores/stats
- Subtle glow effects: `shadow-[0_0_15px_rgba(249,115,22,0.15)]` on active elements
- No clutter. Lots of breathing room. Data-dense but clean.

## API Base
- Local: `http://localhost:8000`
- Deployed: Cloud Run URL (env variable `VITE_API_URL`)

---

## App Shell + Navigation

- [ ] Create `App.jsx` with full-height dark layout (`min-h-screen bg-[#0a0a0f] text-slate-100`)
- [ ] Header bar:
  - Left: "🏀 CourtVision" wordmark in bold, "AI" in orange
  - Right: small settings icon (placeholder, non-functional is fine)
- [ ] Tab navigation below header — 3 tabs:
  - `🔍 Scout` | `🎬 Game Tape` | `🎮 Simulator`
  - Active tab: orange bottom border + orange text
  - Inactive: `text-slate-500 hover:text-slate-300`
  - Tabs stick below header (`sticky top-0 z-10 bg-[#0a0a0f]`)
- [ ] Content area below tabs renders the active feature component
- [ ] Mobile responsive: tabs should be full-width on small screens, text can shrink

---

## Feature 1: 🔍 Scout Agent

### Layout: Two-column on desktop, stacked on mobile

```
┌──────────────────────────────────────────────────┐
│  LEFT SIDEBAR (320px fixed)  │  RIGHT MAIN AREA  │
│                              │                    │
│  Config Section              │  Chat Messages     │
│  - API URL                   │  - User question   │
│  - Session ID + New btn      │  - AI response     │
│                              │    with sources     │
│  Coach Context               │  - User question   │
│  - Your Team                 │  - AI response     │
│  - Injured Players           │                    │
│  - Play Style                │                    │
│                              │                    │
│  Send to Sim Section         │  ── Input Bar ──   │
│  - Opponent name             │  [Type here] [Ask] │
│  - Compile button            │                    │
└──────────────────────────────────────────────────┘
```

### Tasks

- [ ] **Left Sidebar** (`w-80 bg-[#111118] border-r border-white/5 p-5 overflow-y-auto`)
  - [ ] CONFIG section:
    - Label: `text-xs uppercase tracking-wider text-orange-500 font-semibold mb-3`
    - API Base URL input (pre-filled, small text)
    - Session ID input + "New" button (generates `scout_${Date.now()}`)
  - [ ] COACH CONTEXT section:
    - Your Team text input (placeholder "e.g. Auburn")
    - Injured Players text input (placeholder "e.g. Johni Broome, Alex Smith")
    - Play Style text input (placeholder "e.g. uptempo")
    - All inputs: `bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 outline-none`
  - [ ] SEND TO SIMULATOR section:
    - Opponent Team Name input
    - "Compile Intel → Simulator" button: full-width, `bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 rounded-lg py-2.5 font-semibold text-sm`
  - [ ] Mobile: sidebar collapses to a top config bar or hamburger menu

- [ ] **Chat Area** (flex-1, flex column)
  - [ ] Messages container: `flex-1 overflow-y-auto p-6 space-y-4`
  - [ ] Empty state (no messages yet):
    - Large centered icon 🔍
    - "Ask anything about any team" subtitle
    - 4 suggested question chips in a flex-wrap grid:
      - "Full scouting report on Duke"
      - "What's Auburn's biggest weakness?"
      - "Compare UConn and Houston defense"
      - "Scout report on Gonzaga's starting five"
    - Chips: `bg-[#111118] border border-white/10 rounded-full px-4 py-2 text-sm text-slate-300 hover:border-orange-500/50 hover:text-orange-400 cursor-pointer transition-all`
  - [ ] User message bubble:
    - Right-aligned, `bg-orange-600/20 border border-orange-500/30 rounded-xl rounded-br-sm p-4 max-w-[80%] ml-auto`
    - Small "Coach" label above in `text-xs text-orange-400`
  - [ ] AI response bubble:
    - Left-aligned, `bg-[#111118] border border-white/5 rounded-xl rounded-bl-sm p-5 max-w-[85%]`
    - Confidence badge top-right: pill shape `bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full` for high (>0.7), `bg-yellow-500/20 text-yellow-400` for medium, `bg-red-500/20 text-red-400` for low
    - Response text: render with react-markdown, `prose prose-invert prose-sm` styles
    - Sources section (collapsible or always visible):
      - "Sources (N)" label in `text-xs text-slate-500`
      - Source chips: `bg-[#0a0a0f] text-blue-400 text-xs px-2 py-1 rounded border border-blue-500/20 hover:border-blue-500/50` with link to URI
    - Search queries: small pills showing what Gemini searched for, `text-xs text-slate-600`
    - Suggested follow-ups: 3 clickable chips below the response, same style as empty state chips but smaller
  - [ ] Loading state: pulsing dots animation or "Scouting..." text with spinner
  - [ ] Auto-scroll to bottom on new message

- [ ] **Input Bar** (sticky bottom)
  - Container: `border-t border-white/5 bg-[#0a0a0f] p-4`
  - Input + button row: `flex gap-3`
  - Input: `flex-1 bg-[#111118] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-orange-500 outline-none placeholder:text-slate-600`
  - Send button: `bg-orange-600 hover:bg-orange-500 rounded-xl px-5 py-3 font-semibold text-sm transition-colors`
  - Enter key should submit
  - Button disabled while loading

---

## Feature 2: 🎬 Game Tape Analyzer

### Layout: Two-column

```
┌───────────────────────────────────────────────────┐
│  LEFT (video + URL input)    │  RIGHT (analysis)  │
│                              │                     │
│  [Paste YouTube URL] [Go]    │  📊 Game Analysis   │
│                              │  (markdown render)  │
│  ┌─────────────────────┐     │                     │
│  │                     │     │  Follow-up chat     │
│  │   YouTube Embed     │     │  messages below     │
│  │                     │     │                     │
│  └─────────────────────┘     │                     │
│                              │  ── Input Bar ──    │
│  Suggested questions chips   │  [Ask follow-up]    │
└───────────────────────────────────────────────────┘
```

### Tasks

- [ ] **Left Panel** (`w-1/2 p-6`)
  - [ ] URL input bar: `flex gap-2 mb-4`
    - Input: same style as scout inputs but larger, placeholder "Paste YouTube URL..."
    - "Analyze" button: orange gradient, `px-6`
    - Loading state: button shows "Analyzing..." with spinner
  - [ ] YouTube embed: extract video ID from URL, render `<iframe>` in `aspect-video rounded-xl overflow-hidden bg-black`
  - [ ] Before analysis: show empty state "Paste a game link to get started"
  - [ ] After analysis: show suggested follow-up chips below video:
    - "What defense were they running in Q2?"
    - "Who was their best player and why?"
    - "How should we defend their pick and roll?"
    - "What play did they run most in transition?"

- [ ] **Right Panel** (`w-1/2 p-6 flex flex-col`)
  - [ ] Analysis card: `bg-[#111118] rounded-xl p-5 border border-white/5`
    - Header: "📊 Game Analysis" in `text-orange-500 font-semibold`
    - Body: react-markdown rendered, `prose prose-invert prose-sm`
    - Confidence badge (same as scout)
  - [ ] Follow-up messages below analysis (same bubble style as scout)
  - [ ] Input bar at bottom (same style as scout)
  - [ ] Before any analysis: right panel shows centered empty state "Analysis will appear here"

- [ ] **Mobile:** Stack panels vertically — video on top, analysis below

---

## Feature 3: 🎮 Game Simulator

### Layout: Three zones

```
┌──────────────────────────────────────────────────────┐
│              SCOREBOARD (fixed top)                   │
│         AUBURN  71 ━━━━━━━━━━━━ 73  DUKE            │
│              Q4  ·  3:12  ·  AUBURN BALL             │
├──────────────────────────┬───────────────────────────┤
│                          │                           │
│     BASKETBALL COURT     │    PLAY-BY-PLAY FEED     │
│     (2D SVG with ball)   │    (scrolling text)       │
│                          │                           │
│                          │                           │
├──────────────────────────┴───────────────────────────┤
│              COACH DECISION PANEL                     │
│  [Zone] [Press] [Timeout] [Bench] [Post] [Slow]     │
│                              [Continue ▶]            │
└──────────────────────────────────────────────────────┘
```

### Tasks — Setup Screen (before game starts)

- [ ] Centered card: `max-w-lg mx-auto bg-[#111118] rounded-2xl p-8 border border-white/5`
- [ ] Title: "🎮 Game Simulator" large and bold
- [ ] Two team inputs side by side:
  - `grid grid-cols-2 gap-4`
  - Label "Team A" / "Team B" in `text-xs text-slate-500`
  - Inputs same style as scout
  - VS badge between them: `text-slate-600 font-bold`
- [ ] Scenario picker — 3 cards in a row:
  - "🔥 Clutch Time" (default selected) — "5 min left, close game"
  - "🏀 Full Game" — "Tip-off to buzzer"
  - "💪 Comeback" — "Down 15, fight back"
  - Selected: `border-orange-500 bg-orange-500/10`
  - Unselected: `border-white/10 bg-[#0a0a0f] hover:border-white/20`
  - Each: `rounded-xl p-4 cursor-pointer transition-all border`
- [ ] "Load Scout Intel" checkbox/toggle (if scout session exists)
- [ ] "Start Simulation" button: full-width, large, orange gradient, `py-4 text-lg font-bold rounded-xl`

### Tasks — Scoreboard

- [ ] Fixed bar at top of game view: `bg-[#111118] border-b border-white/5 py-4 px-6`
- [ ] Layout: `flex items-center justify-center gap-8`
- [ ] Team A name (left, `text-orange-400 font-bold text-lg`) | score_a (`text-4xl font-mono font-bold`) | divider `text-slate-600` | score_b (`text-4xl font-mono font-bold text-blue-400`) | Team B name (right, `text-blue-400 font-bold text-lg`)
- [ ] Below score: Quarter badge (`bg-white/10 rounded-full px-3 py-0.5 text-xs`) + time remaining (`font-mono text-slate-400`) + possession indicator (small orange/blue dot)

### Tasks — Basketball Court (2D SVG)

- [ ] SVG container: `aspect-[5/3] w-full max-w-xl bg-[#1a1a2e] rounded-xl overflow-hidden border border-white/5`
- [ ] Court lines in `stroke="#334155" stroke-width="1.5"`:
  - Outer rectangle
  - Half-court line (vertical center)
  - Center circle (radius ~30)
  - Paint rectangle (left side)
  - Free throw line
  - Three-point arc (semicircle approximation)
- [ ] Ball: `<circle r="8" fill="#f97316">` with CSS `transition: all 0.6s ease-in-out`
- [ ] Ball position: read `location` from the latest play, map to coordinates using the LOCATIONS object from PRD
- [ ] Optional glow on ball: `filter: drop-shadow(0 0 6px rgba(249,115,22,0.6))`
- [ ] When a play is a made shot: brief pulse animation on the ball (scale up then back)

### Tasks — Play-by-Play Feed

- [ ] Scrolling container: `flex-1 overflow-y-auto p-4 space-y-2`
- [ ] Each play row:
  - `flex items-start gap-3 py-2 border-b border-white/5 last:border-0`
  - Time: `text-xs font-mono text-slate-500 w-12 shrink-0` (e.g. "4:32")
  - Team badge: small colored dot or pill (`bg-orange-500` for team A, `bg-blue-500` for team B) with `rounded-full w-2 h-2 mt-1.5 shrink-0`
  - Action text: `text-sm text-slate-300`
  - Score: `text-xs font-mono text-slate-500 shrink-0 ml-auto` (e.g. "71-73")
- [ ] Play type icons inline:
  - made_shot: 🏀
  - missed_shot: ❌
  - turnover: 🔄
  - foul/free_throw: 🚨
  - steal: 💨
  - block: 🛡️
- [ ] Coach decision entries styled differently:
  - `bg-orange-500/10 border border-orange-500/20 rounded-lg p-3`
  - "📋 COACH: Full court press" in `text-orange-400 font-semibold text-sm`
- [ ] Auto-scroll to bottom after new plays load
- [ ] "Simulating..." loading indicator at bottom while API is pending

### Tasks — Coach Decision Panel

- [ ] Container: `bg-[#111118] border-t border-white/5 p-4`
- [ ] Preset buttons row: `flex flex-wrap gap-2 mb-3`
  - Each button: `bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-2 text-sm text-slate-300 hover:border-orange-500/50 hover:text-orange-400 hover:bg-orange-500/5 transition-all`
  - Buttons: "Zone defense", "Full court press", "Call timeout", "Sub bench", "Feed the post", "Slow it down"
- [ ] Continue button: `bg-slate-700 hover:bg-slate-600 rounded-lg px-6 py-2.5 text-sm font-medium`
- [ ] All buttons get `disabled:opacity-30 disabled:cursor-not-allowed` while loading
- [ ] When a button is clicked:
  1. Add a coach decision entry to the play-by-play feed
  2. Call the API
  3. Disable all buttons until response comes back
  4. Render new plays

### Mobile Responsive

- [ ] On mobile (`< 768px`):
  - Simulator: stack court above feed, full width each
  - Scout: sidebar becomes a collapsible top section
  - Game Tape: video on top, analysis below, full width
  - Coach buttons: `flex-wrap` handles this naturally
  - Scoreboard: shrink font sizes, keep centered layout

---

## Global Components

- [ ] **Loading spinner**: small orange spinning circle, reusable
- [ ] **Confidence badge**: component that takes a number 0-1 and renders green/yellow/red pill
- [ ] **Error toast**: fixed bottom-right, red bg, auto-dismiss after 5s, shows API error messages
- [ ] **Markdown renderer**: wrapper around react-markdown with `prose prose-invert prose-sm` + custom styles for tables, code blocks, bold text

---

## Build Order (if time is tight)

Priority 1 — Get these working first:
1. App shell + tabs
2. Scout chat (this is already your strongest feature, make it look great)
3. Simulator setup + scoreboard + play feed + coach buttons

Priority 2 — Then these:
4. Court SVG with ball
5. Game Tape analyzer page
6. Polish (animations, empty states, mobile)

Priority 3 — Nice to have:
7. Suggested question chips
8. Source display styling
9. Play type icons
10. Ball glow/pulse animation