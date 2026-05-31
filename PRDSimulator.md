# PRD: CourtVision AI — Game Simulator (1-Hour Build)

## What It Does

Coach picks two teams → sets pre-game tactics (injured players, play style) → AI simulates a basketball game as JSON play-by-play → 2D court shows ball moving per play → coach pauses and makes tactical calls → simulation adjusts. Powered by Gemini Flash + Google Search grounding + Scout Agent intel.

---

## Scope — What We're Building vs Skipping

### BUILDING (MVP)
- `/api/simulator/start` — fetch real stats, generate first chunk of plays as JSON
- `/api/simulator/action` — coach sends tactical decision, get next chunk
- `/api/simulator/continue` — next chunk without intervention
- Frontend: court SVG with ball dot, scoreboard, play-by-play feed, preset coach buttons
- Scout intel integration (read from `intel_store` dict)
- Pre-game coach context: injured players + play style flow into simulation (AI never plays injured players)

### SKIPPING (not worth the time)
- `/api/simulator/end` endpoint (just stop clicking continue)
- Post-game summary / box score
- AI suggestion card with approval flow
- Custom text input for coach decisions (preset buttons only)
- Win probability bar
- Animated play-by-play reveal (show all plays at once, ball jumps to last position)

---

## API Contract

### `POST /api/simulator/start`

**Request:**
```json
{
  "team_a": "Auburn",
  "team_b": "Duke",
  "scenario": "clutch_time",
  "session_id": "sim_001",
  "scout_session_id": "scout_001",
  "coach_context": {
    "injured_players": ["Johni Broome"],
    "style": "uptempo"
  }
}
```

- `coach_context` (optional): injected into the simulation prompt. AI will never generate plays using injured players. Style hint shapes pace (uptempo = more fast breaks, half-court = fewer possessions).

**Response:**
```json
{
  "plays": [
    {
      "quarter": 4,
      "time": "5:00",
      "team": "AUBURN",
      "action": "Rivers pushes in transition, pulls up from the left wing... GOOD!",
      "location": "LEFT_WING",
      "score_a": 68,
      "score_b": 68,
      "play_type": "made_shot"
    }
  ],
  "game_state": {
    "quarter": 4,
    "time_remaining": "3:12",
    "score_a": 71,
    "score_b": 73,
    "possession": "AUBURN"
  },
  "session_id": "sim_001"
}
```

### `POST /api/simulator/action`

**Request:**
```json
{
  "action": "Full court press",
  "session_id": "sim_001"
}
```

**Response:** Same structure as `/start`.

### `POST /api/simulator/continue`

**Request:**
```json
{ "session_id": "sim_001" }
```

**Response:** Same structure.

---

## System Prompt

```
You are CourtVision AI Game Simulator. You simulate realistic basketball games
using real team and player statistics.

RESPOND WITH VALID JSON ONLY. No markdown, no backticks, no preamble.

Return this exact structure:
{
  "plays": [
    {
      "quarter": 4,
      "time": "4:32",
      "team": "TEAM_NAME",
      "action": "Vivid play description like a real commentator",
      "location": "VALID_LOCATION",
      "score_a": 68,
      "score_b": 70,
      "play_type": "made_shot"
    }
  ],
  "game_state": {
    "quarter": 4,
    "time_remaining": "3:12",
    "score_a": 71,
    "score_b": 73,
    "possession": "TEAM_NAME"
  }
}

VALID LOCATIONS: LEFT_WING, RIGHT_WING, TOP_KEY, LEFT_BLOCK, RIGHT_BLOCK,
PAINT, LEFT_CORNER, RIGHT_CORNER, MID_RANGE_LEFT, MID_RANGE_RIGHT,
FAST_BREAK, FULL_COURT, FREE_THROW

RULES:
- Generate 6-8 possessions per response
- Use REAL player names
- A 36% 3PT shooter hits ~1 in 3. No hot streaks of 5-for-5.
- Momentum runs of 6-0 to 10-0 are common. 15-0+ is very rare.
- When coach makes a tactical change, show impact over next 2-3 possessions.
- Play descriptions should be exciting like a real commentator.
- score_a and score_b must only increase, never decrease.
- time must only decrease within a quarter.
- NEVER generate plays involving a player listed as INJURED. If their name appears in INJURED_PLAYERS, they are not on the court.
- If play style is provided, reflect it in pace and play selection throughout.

COACH DECISION EFFECTS:
- "Zone defense" → fewer drives, more opponent 3PT attempts
- "Full court press" → more turnovers but more opponent fast breaks
- "Call timeout" → momentum resets
- "Feed the post" → more post possessions using that player's real stats
- "Slow it down" → fewer possessions, more half-court
- "Sub bench" → lower efficiency from bench players
```

---

## Backend Implementation Notes

**Two Gemini calls on `/start`:**

Call 1 — Grounded stat fetch (WITH search tool, text output):
```python
search_tool = types.Tool(google_search=types.GoogleSearch())
stat_response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=f"Current 2025-2026 season stats for {team_a} and {team_b} basketball. Rosters, records, key player stats, shooting percentages.",
    config=types.GenerateContentConfig(
        tools=[search_tool],
        temperature=0.1,
        max_output_tokens=2000,
    )
)
team_data = stat_response.text
```

Call 2 — Simulation (NO search tool, JSON output):
```python
# Load scout intel if available
scout_intel = intel_store.get(team_b, "No scout intel available.")

scenario_prompts = {
    "clutch_time": f"Q4, 5:00 remaining. {team_a} 65 - {team_b} 68. Close game.",
    "full_game": "Start from tip-off, Q1 12:00.",
    "comeback": f"{team_a} is down 15 with 8:00 left in Q3.",
}

# Build coach context block
coach_block = ""
if coach_context:
    if coach_context.get("injured_players"):
        names = ", ".join(coach_context["injured_players"])
        coach_block += f"\nINJURED_PLAYERS (do NOT play them): {names}"
    if coach_context.get("style"):
        coach_block += f"\nCOACH STYLE: {coach_context['style']}"

prompt = f"""TEAM DATA:\n{team_data}\n\nSCOUT INTEL:\n{scout_intel}{coach_block}\n\nSCENARIO: {scenario_prompts[scenario]}\n\nBegin simulation. Generate 6-8 possessions."""

sim_response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt,
    config=types.GenerateContentConfig(
        system_instruction=SIMULATOR_SYSTEM_PROMPT,
        temperature=0.7,
        max_output_tokens=4000,
        response_mime_type="application/json",
    )
)

data = json.loads(sim_response.text)
```

**Multi-turn for `/action` and `/continue`:**
```python
# Load full conversation history from sim_sessions[session_id]
# Append new message and call Gemini with full history
# For /action: "COACH DECISION: {action}\nSimulate next 6-8 possessions."
# For /continue: "Continue simulation. Next 6-8 possessions."
```

**JSON parsing safety:**
```python
try:
    data = json.loads(response.text)
except json.JSONDecodeError:
    clean = response.text.replace("```json", "").replace("```", "").strip()
    data = json.loads(clean)
```

---

## Court Location Coordinates (for frontend)

```javascript
const LOCATIONS = {
  LEFT_CORNER:     { x: 50,  y: 270 },
  LEFT_WING:       { x: 100, y: 80  },
  TOP_KEY:         { x: 250, y: 50  },
  RIGHT_WING:      { x: 400, y: 80  },
  RIGHT_CORNER:    { x: 450, y: 270 },
  LEFT_BLOCK:      { x: 170, y: 200 },
  RIGHT_BLOCK:     { x: 330, y: 200 },
  PAINT:           { x: 250, y: 180 },
  MID_RANGE_LEFT:  { x: 150, y: 140 },
  MID_RANGE_RIGHT: { x: 350, y: 140 },
  FREE_THROW:      { x: 250, y: 130 },
  FAST_BREAK:      { x: 250, y: 150 },
  FULL_COURT:      { x: 250, y: 150 },
};
```

Court is a 500x300 SVG. Ball is an orange circle (12px) with `transition: all 0.6s ease-in-out`. On each play, move ball to `LOCATIONS[play.location]`.