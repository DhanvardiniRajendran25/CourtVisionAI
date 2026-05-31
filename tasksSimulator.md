# TASKS.md — Game Simulator (1-Hour Sprint)

## Split: Backend (you) + Frontend (teammate, parallel)

---

## BACKEND — Your Tasks

### Block 1 (0:00–0:10): Schemas + Prompt File

- [ ] Add to `models/schemas.py`:
  ```python
  class SimCoachContext(BaseModel):
      injured_players: list[str] = []   # AI will never play these
      style: Optional[str] = None       # e.g. "uptempo", "half-court"

  class SimStartRequest(BaseModel):
      team_a: str
      team_b: str
      scenario: str = "clutch_time"  # clutch_time | full_game | comeback
      session_id: str = "default"
      scout_session_id: Optional[str] = None
      coach_context: Optional[SimCoachContext] = None  # pre-game tactics

  class PlayItem(BaseModel):
      quarter: int
      time: str
      team: str
      action: str
      location: str
      score_a: int
      score_b: int
      play_type: str

  class GameState(BaseModel):
      quarter: int
      time_remaining: str
      score_a: int
      score_b: int
      possession: str

  class SimResponse(BaseModel):
      plays: list[PlayItem]
      game_state: GameState
      session_id: str

  class SimActionRequest(BaseModel):
      action: str
      session_id: str

  class SimContinueRequest(BaseModel):
      session_id: str
  ```
- [ ] Create `prompts/simulator_system.py` — copy the system prompt from PRD verbatim
- [ ] Create `sim_sessions: dict` in simulator router
- [ ] Import `intel_store` from scout router (or wherever it lives)

**✅ Checkpoint:** Schemas importable, prompt ready.

### Block 2 (0:10–0:30): /start Endpoint

- [ ] Replace simulator stub with real implementation
- [ ] **Call 1 — Stat fetch** (with google search tool, text output):
  - Prompt: "Current 2025-2026 season stats for {team_a} and {team_b} basketball. Rosters, records, key player stats."
  - Store result as `team_data` string
- [ ] **Load scout intel**: `intel_store.get(req.team_b, "No scout intel.")`
- [ ] **Call 2 — Simulation** (NO search tool, JSON output):
  - Build prompt: team_data + scout_intel + scenario description
  - Set `response_mime_type="application/json"`
  - Set `temperature=0.7`, `max_output_tokens=4000`
  - System instruction = SIMULATOR_SYSTEM_PROMPT
- [ ] Parse JSON response with try/except (strip backticks if needed)
- [ ] Store conversation in `sim_sessions[session_id]`
- [ ] Return `SimResponse`
- [ ] **Test:** Hit `/start` in Swagger with Auburn vs Duke clutch_time. Verify: real player names, valid locations, scores make sense.

**✅ Checkpoint:** Simulation starts with real grounded data. This is the core.

### Block 3 (0:30–0:45): /action + /continue

- [ ] `/action` endpoint:
  - Load history from `sim_sessions[session_id]`
  - Build `contents` list from full conversation history as `types.Content` objects
  - Append: `"COACH DECISION: {action}\nSimulate next 6-8 possessions reflecting this change."`
  - Call Gemini (same config as Call 2 from /start — JSON output, no search tool)
  - Parse, update session, return `SimResponse`
- [ ] `/continue` endpoint:
  - Same as `/action` but message: `"Continue simulation. Next 6-8 possessions."`
- [ ] **Test:** Start → continue → action "Full court press" → continue. Verify:
  - Scores only go up
  - Time only goes down
  - Press causes some turnovers in the next chunk
  - Player names are consistent

**✅ Checkpoint:** Full game loop works. Coach decisions affect simulation.

### Block 4 (0:45–0:55): Edge Cases + Redeploy

- [ ] Wrap all Gemini calls in try/except
- [ ] Handle JSON parse failure: strip ```json``` backticks and retry
- [ ] Handle missing session_id → return 404
- [ ] Handle Gemini timeout → return error message
- [ ] **Test full A2A flow:**
  1. Scout Duke (use existing scout session)
  2. Send intel to sim
  3. Start Auburn vs Duke with `scout_session_id`
  4. Verify AI uses scout data (mentions Duke weaknesses, Brown's FT%)
- [ ] Redeploy to Cloud Run

### Block 5 (0:55–1:00): Handoff

- [ ] Verify frontend teammate can hit all 3 endpoints from their UI
- [ ] Quick test: start → action → continue loop works from frontend
- [ ] Fix any last CORS or response format issues

---

## FRONTEND — Teammate's Tasks (Parallel)

### Block 1 (0:00–0:20): Court + Scoreboard (Mock Data)

- [ ] Court SVG component: 500x300 rectangle with:
  - Court outline, paint rectangle, three-point arc (semicircle), free-throw line
  - Dark theme: `#1a1a2e` background, white/gray lines
- [ ] Ball component: orange circle 12px, positioned with CSS `transform: translate(x, y)`
  - `transition: all 0.6s ease-in-out` for smooth movement
- [ ] Location coordinate map (copy from PRD)
- [ ] Scoreboard: Team A | score_a - score_b | Team B + quarter + time
- [ ] Play-by-play feed: scrolling div, each play as a row with time + team badge + action text
- [ ] **Test with hardcoded mock plays array** — ball should move, score should update

### Block 2 (0:20–0:35): Game Setup + Coach Buttons

- [ ] Setup view:
  - Two text inputs (Team A, Team B)
  - 3 scenario buttons (Clutch Time selected by default, Full Game, Comeback)
  - "Load Scout Intel" checkbox
  - **Pre-game coach context section:**
    - Injured players text input (comma-separated) — passed as `coach_context.injured_players`
    - Play style dropdown: "Default / Uptempo / Half-court / Defensive" — passed as `coach_context.style`
  - "Start Simulation" button
- [ ] Coach decision panel (shows after plays load):
  - 6 preset buttons in a row: "Zone defense", "Full court press", "Call timeout", "Sub bench", "Feed the post", "Slow it down"
  - "Continue ▶" button
  - All disabled while loading

### Block 3 (0:35–0:50): Wire to API

- [ ] Start button → `POST /api/simulator/start` → render plays + court + scoreboard
- [ ] Preset buttons → `POST /api/simulator/action` with button text as action
- [ ] Continue button → `POST /api/simulator/continue`
- [ ] On each response:
  - Update ball position to last play's location
  - Update scoreboard from `game_state`
  - Append plays to feed
  - Auto-scroll feed to bottom
- [ ] Loading spinner while waiting for API

### Block 4 (0:50–1:00): Polish

- [ ] Color code plays by team (orange vs blue)
- [ ] Play type icons (🏀 made, ❌ miss, 🔄 turnover, 🚨 foul)
- [ ] Highlight the coach decision in the feed when it happens ("📋 COACH: Full court press")
- [ ] Smooth transitions between states (setup → game → playing)
- [ ] Error toast if API fails

---

## Demo Flow (60 seconds)

**Setup:** Auburn vs Duke, Clutch Time, Scout Intel loaded

**Show:** Plays appear, ball moves on court, score updates → "Duke up 73-71 with 3:12 left"

**Coach call:** Click "Full court press" → next chunk shows turnovers → "Auburn ties it 73-73!"

**Continue:** Let it play → close finish

**Call out to judges:** "The press decision was informed by our Scout Agent finding that Duke's young guards struggle under pressure — that data flowed from Scout to Simulator through A2A."

**That single moment = ADK + A2A + Search Grounding + Human-in-the-Loop + Real Stats. Every rubric box checked.**