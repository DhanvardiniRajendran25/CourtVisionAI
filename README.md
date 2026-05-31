# 🏀 CourtVision AI — Scout Agent Backend

A production-grade FastAPI backend powering CourtVision AI's Scout Agent: a natural language basketball scouting and real-time simulation intelligence system built on **Gemini 2.5 Flash + Google Search Grounding + Chirp Speech-to-Text**.

> Built at the Frontiers Gen-AI Hackathon @ The Engine, Cambridge — in partnership with Google DeepMind. Deployed on Google Cloud Run within a $25 credit budget.


<img width="718" height="858" alt="image" src="https://github.com/user-attachments/assets/0d076114-5b88-4779-bf06-ae134f0a522b" />


---

## Table of Contents

- [Overview](#overview)
- [Tool Stack](#tool-stack)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Voice Pipeline — Chirp STT](#voice-pipeline--chirp-stt)
- [API Reference](#api-reference)
- [Intelligence Design — Gemini 2.5 Flash](#intelligence-design--gemini-25-flash)
- [Real-Time Court Simulation](#real-time-court-simulation)
- [Session Management](#session-management)
- [Grounding & Confidence](#grounding--confidence)
- [System Prompt](#system-prompt)
- [Prompt Design — Google AI Studio](#prompt-design--google-ai-studio)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Error Handling](#error-handling)
- [Frontend Integration](#frontend-integration)

---

## Overview

The Scout Agent backend does five things:

1. **Accepts voice or text input** from coaches — Chirp transcribes spoken questions into text in real time so coaches can talk to the AI pilot naturally
2. **Grounds every response** in real current-season statistics using Gemini's Google Search tool — no hallucinated stats
3. **Maintains multi-turn conversation memory** per session so coaches can ask follow-up questions without re-stating context
4. **Drives real-time court simulation** — Gemini Flash reasons about player instructions, decides state updates, generates pilot dialogue, and progresses the game narrative live
5. **Compiles scouting intel** into a structured brief that the Simulator agent can ingest

This service also acts as the **shared backend foundation** for the full CourtVision AI system — it sets up the FastAPI project structure, CORS configuration, and stub endpoints that Video Analyzer and Simulator agents plug into.

---

## Tool Stack

| Tool | Role | What It Does |
|---|---|---|
| **Gemini 2.5 Flash** | Core AI brain | Pilot dialogue generation, story progression, player instruction reasoning, state update decisions, grounded scouting responses |
| **Chirp (Google STT)** | Speech-to-text | Player voice → text transcript. Enables voice-driven interaction with the AI pilot instead of typing |
| **Google AI Studio** | Prompt design & testing | Experiment with Gemini Flash, tune pilot personality, test responses before production integration |
| **Google Cloud Run** | Deployment | Serverless, containerized, auto-scales to zero, within $25 credit budget |

---

## Architecture

```
Player Voice
    │
    ▼
Chirp (Google STT)                    Coach Typed Input
    │                                         │
    └──────────────┬──────────────────────────┘
                   │
                   ▼
            FastAPI Server
                   │
        ┌──────────┴───────────┐
        │    Session Store     │
        │   (in-memory dict)   │
        └──────────┬───────────┘
                   │
        ┌──────────▼──────────────────────────────────┐
        │           Intelligence Layer                │
        │                                             │
        │  • Gemini 2.5 Flash  ←── Google AI Studio  │
        │  • Google Search Grounding tool             │
        │  • Coach context injection                  │
        │  • Follow-up extraction (regex parser)      │
        │  • Confidence scoring (grounding heuristic) │
        └──────────┬──────────────────────────────────┘
                   │
        ┌──────────▼──────────────────────────────────┐
        │       Real-Time Court Simulation            │
        │                                             │
        │  • Gemini Flash drives live state updates   │
        │  • Player instruction → AI reasoning        │
        │  • Pilot dialogue generation                │
        │  • Story progression & game narrative       │
        └──────────┬──────────────────────────────────┘
                   │
                   ▼
         Structured JSON Response
   (answer + confidence + sources + search_queries
    + suggested_followups + court_state + pilot_dialogue)
                   │
                   ▼
      /api/scout/send-to-sim
      → Intel summary → Simulator Agent
```

**Architectural principles:**
- **Voice-first input** — Chirp STT enables natural spoken interaction; typed input is the fallback path
- **Stateless per request, stateful per session** — all session state lives in-memory; each API call is independently completable
- **Grounding before generation** — the Google Search tool fires *before* Gemini writes a word, ensuring stats are real
- **AI as simulation engine** — Gemini Flash is not just a Q&A layer; it drives live court state decisions and pilot dialogue
- **Separation of concerns** — scouting, video analysis, and simulation are independent service modules sharing a single FastAPI app
- **Hackathon-pragmatic** — in-memory session store, no database dependency, serverless deployment

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | FastAPI (Python) | Auto-generates Swagger docs, async support, fast to build |
| AI Model | Gemini 2.5 Flash | Low-latency inference, native Google Search grounding, strong reasoning for simulation |
| AI SDK | `google-genai` v1.14.0+ | Official unified SDK — replaces deprecated `google-generativeai` |
| Speech-to-Text | Chirp (Google STT) | Real-time voice transcription for voice-driven gameplay |
| Search Grounding | Google Search tool | Real-time current-season basketball statistics |
| Prompt Design | Google AI Studio | Pilot personality tuning, response testing before production |
| Session Store | In-memory Python dict | Zero-dependency, sufficient for hackathon scale |
| Deployment | Google Cloud Run | Serverless, containerized, within $25 budget |

> **Important:** Use `google-genai`, not `google-generativeai`. The latter is deprecated and will break grounding tool calls.

---

## Voice Pipeline — Chirp STT

Chirp handles the speech-to-text layer, enabling players and coaches to speak directly to the AI pilot instead of typing.

### Flow

```
Player speaks
    │
    ▼
Audio stream captured (frontend microphone)
    │
    ▼
Chirp (Google Speech-to-Text)
    │
    ▼
Text transcript
    │
    ▼
Gemini Flash (same pipeline as typed input)
```

### Why Chirp

- Real-time transcription keeps latency low during active gameplay
- Enables natural coaching language — coaches talk the way they actually coach
- Transcript feeds directly into the same Gemini pipeline as typed questions — no separate handling required

---

## API Reference

### `GET /health`

Health check for deployment verification and uptime monitoring.

**Response:**
```json
{ "status": "ok" }
```

---

### `POST /api/scout/ask`

Core scouting endpoint. Accepts a natural language coaching question (via typed input or Chirp transcript) and returns a grounded tactical response.

**Request:**
```json
{
  "question": "What's Duke's biggest weakness this season?",
  "session_id": "scout_abc123",
  "coach_context": {
    "team": "Auburn",
    "injured_players": ["Johni Broome"],
    "style": "uptempo"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `question` | string | ✅ | Natural language scouting question — typed or Chirp transcript |
| `session_id` | string | ❌ | Groups messages into a conversation thread. Defaults to `"default"` |
| `coach_context` | object | ❌ | Coach's team info. AI personalizes strategy and **never** suggests plays relying on injured players |

**Response:**
```json
{
  "answer": "Duke's biggest vulnerability this season is perimeter defense...",
  "confidence": 0.85,
  "sources": [
    { "title": "ESPN Duke Blue Devils Stats", "uri": "https://espn.com/..." },
    { "title": "KenPom Rankings", "uri": "https://kenpom.com/..." }
  ],
  "search_queries": ["Duke basketball weaknesses 2025-2026 season stats"],
  "suggested_followups": [
    "How do they perform in the second half?",
    "Who is their weakest perimeter defender?",
    "What's their record against top-25 teams?"
  ],
  "session_id": "scout_abc123"
}
```

| Field | Description |
|---|---|
| `answer` | Tactical response with real player names, specific statistics, and actionable coaching suggestions |
| `confidence` | Float 0–1. Derived from grounding quality, not model self-assessment |
| `sources` | Extracted from `grounding_metadata.grounding_chunks` — actual web sources Gemini searched |
| `search_queries` | Exact queries Gemini fired against Google Search. Surfaced in UI for transparency |
| `suggested_followups` | Three follow-up questions parsed from a structured `FOLLOWUPS:` token |

---

### `POST /api/scout/send-to-sim`

Compiles all scouting intel from a session into a structured brief for the Simulator agent.

**Request:**
```json
{
  "session_id": "scout_abc123",
  "team": "Duke"
}
```

**Response:**
```json
{
  "intel_summary": "DUKE SCOUTING INTEL:\n- Weak perimeter defense (35.2% opponent 3PT)\n- Turnover-prone under full court press (13.2 TO/game)\n...",
  "status": "ready_for_simulator"
}
```

**How it works:** Grabs all model responses from the session history, sends them to Gemini Flash with a summarization prompt, stores the result in a shared `intel_store` dict readable by the Simulator agent, and returns the summary.

---

### Stub Endpoints

These return `{"status": "not_implemented"}` so the frontend can wire up all pages immediately:

```
POST /api/video/analyze
POST /api/video/followup
POST /api/simulator/start
POST /api/simulator/action
POST /api/simulator/continue
```

---

## Intelligence Design — Gemini 2.5 Flash

Gemini 2.5 Flash is the core AI brain of the system. It handles four distinct responsibilities:

1. **Pilot dialogue generation** — produces spoken responses from the AI pilot to the player
2. **Story progression** — decides how the game narrative advances based on player actions
3. **Player instruction reasoning** — interprets what the player is trying to do and determines the outcome
4. **Grounded scouting responses** — answers tactical questions anchored to real current-season statistics

### SDK initialization

```python
from google import genai
from google.genai import types

client = genai.Client(api_key=GEMINI_API_KEY)
```

### Grounded generation call

```python
google_search_tool = types.Tool(google_search=types.GoogleSearch())

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=contents,  # list of types.Content — full multi-turn history
    config=types.GenerateContentConfig(
        system_instruction=SCOUT_SYSTEM_PROMPT,
        tools=[google_search_tool],
        temperature=0.2,        # low temperature for factual precision
        max_output_tokens=3000,
    )
)
```

### Extracting grounding metadata

```python
answer = response.text

sources = []
grounding_meta = response.candidates[0].grounding_metadata
if grounding_meta and grounding_meta.grounding_chunks:
    for chunk in grounding_meta.grounding_chunks:
        if chunk.web:
            sources.append({
                "title": chunk.web.title or "",
                "uri": chunk.web.uri or ""
            })

search_queries = []
if grounding_meta and grounding_meta.web_search_queries:
    search_queries = list(grounding_meta.web_search_queries)
```

---

## Real-Time Court Simulation

Gemini Flash drives live basketball court simulation. Player instructions are interpreted by the AI, translated into court state updates, and rendered in real time on the frontend.

### Simulation flow

```
Player instruction (voice via Chirp or typed)
    │
    ▼
Gemini Flash — reasoning about instruction
    │
    ▼
State update decision (positions, score, clock, narrative)
    │
    ▼
Court render update (frontend)
    │
    ▼
Pilot dialogue response → player
```

### What Gemini reasons about in simulation

- **Player actions** — what the player is attempting and whether it succeeds
- **Opponent behavior** — how the opposing team responds based on scouting intel
- **Game narrative** — how the story of the game progresses across turns
- **Pilot dialogue** — what the AI coach/pilot says back to the player in response

### Game state structure

```python
game_state = {
    "court": { ... },           # player and opponent positions
    "score": {"home": 0, "away": 0},
    "clock": "12:00",
    "quarter": 1,
    "narrative": [...],         # list of game events so far
    "pilot_context": { ... }    # AI pilot's awareness of the situation
}
```

The full game state is injected into each Gemini call so the AI maintains coherent awareness across turns — the pilot remembers what happened two possessions ago.

---

## Session Management

Sessions are maintained as an in-memory dict keyed by `session_id`. Each session stores a conversation history of role/content pairs enabling genuine multi-turn context.

```python
sessions: dict[str, list[dict]] = {}

# Structure:
# sessions["scout_abc123"] = [
#     {"role": "user",  "text": "What's Duke's weakness?"},
#     {"role": "model", "text": "Duke's biggest vulnerability..."},
#     {"role": "user",  "text": "How about their free throw shooting?"},
#     {"role": "model", "text": "Duke shoots 71.2% from the line..."},
# ]
```

When building the Gemini `contents` payload, the full session history is converted into `types.Content` objects:

```python
contents = []
for msg in session_history:
    contents.append(
        types.Content(
            role=msg["role"],
            parts=[types.Part(text=msg["text"])]
        )
    )
contents.append(
    types.Content(role="user", parts=[types.Part(text=question)])
)
```

---

## Grounding & Confidence

### Why grounding matters here

Basketball scouting requires exact numbers — "they struggle defensively" is useless; "they rank 187th nationally in 3PT defense, allowing 35.2% from deep" is actionable. Gemini's Google Search grounding tool fires real web searches before generating text, anchoring every stat to a live source.

### Confidence scoring heuristic

Confidence is **derived from grounding quality**, not asked of the model. Model self-assessed confidence is unreliable and often overconfident:

```python
def calculate_confidence(grounding_metadata) -> float:
    if not grounding_metadata or not grounding_metadata.grounding_chunks:
        return 0.5
    num_sources = len(grounding_metadata.grounding_chunks)
    if num_sources >= 3: return 0.9
    elif num_sources == 2: return 0.8
    elif num_sources == 1: return 0.7
    return 0.5
```

### Follow-up extraction

```python
import json, re

def extract_followups(answer_text: str) -> tuple[str, list[str]]:
    followups = []
    clean_answer = answer_text

    match = re.search(r'FOLLOWUPS:\s*(\[.*?\])', answer_text, re.DOTALL)
    if match:
        try:
            followups = json.loads(match.group(1))
            clean_answer = answer_text[:match.start()].strip()
        except json.JSONDecodeError:
            pass

    if not followups:
        followups = [
            "Tell me more about their key players",
            "How do they perform under pressure?",
            "What's their record in away games?"
        ]

    return clean_answer, followups
```

---

## System Prompt

```
You are CourtVision AI Scout, an elite basketball scouting assistant and AI pilot.

You help coaches prepare for upcoming opponents by providing tactical intelligence
grounded in REAL, CURRENT-SEASON statistics. During simulation, you drive live
gameplay as the pilot — generating dialogue, reasoning about player actions, and
progressing the game narrative.

RESPONSE FORMAT — You MUST structure every scouting response as follows:

1. DIRECT ANSWER: Lead with the tactical answer. Be specific. Use real numbers.
   Name players. Cite stats.

2. KEY STATS: Pull 3-5 most relevant statistics that support your answer.

3. TACTICAL RECOMMENDATION: Give 1-2 actionable coaching suggestions.
   If coach_context is provided, tailor to their team and style.
   NEVER suggest strategies relying on players listed as injured.

4. CONFIDENCE NOTE: Rate your confidence (High/Medium/Low) based on data availability.
   High = multiple current sources with specific stats.
   Medium = some data but incomplete picture.
   Low = limited data, more speculative.

5. SUGGESTED FOLLOW-UPS: End with exactly 3 follow-up questions.
   Format: FOLLOWUPS: ["question 1", "question 2", "question 3"]

RULES:
- Use 2025-2026 season data when available
- Always cite specific numbers — never say "they struggle", say "they rank 234th in
  turnover margin at -2.3/game"
- Frame everything from a coaching perspective
- Be concise. Coaches are busy.
- During simulation: stay in character as the pilot, reason about player actions
  explicitly, and update game state in every response
```

---

## Prompt Design — Google AI Studio

All Gemini Flash prompts — scouting system prompt, pilot personality, simulation reasoning instructions — were **designed and iterated in Google AI Studio** before production integration.

### What Google AI Studio was used for

- **Pilot personality tuning** — shaping how the AI pilot speaks, its coaching tone, and how it handles uncertainty
- **Simulation prompt testing** — validating that Gemini correctly interprets player instructions and produces coherent state updates
- **Scouting response testing** — verifying response format, stat citation quality, and follow-up question relevance across edge cases
- **Temperature calibration** — determining that `temperature=0.2` produces the right balance of factual precision and natural language

### Workflow

```
Prompt draft in Google AI Studio
    │
    ▼
Test against sample basketball scenarios
    │
    ▼
Iterate on pilot personality and format constraints
    │
    ▼
Finalize SCOUT_SYSTEM_PROMPT constant
    │
    ▼
Integrate into production FastAPI service
```

---

## Deployment

### Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### Deploy to Cloud Run

```bash
gcloud run deploy courtvision-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=your-key" \
  --memory 1Gi \
  --timeout 300
```

**Why Cloud Run:** Serverless, auto-scales to zero between requests, containerized, no infrastructure management. Fits within the $25 hackathon credit budget.

---

## Project Structure

```
courtvision-backend/
├── main.py                    # FastAPI app, CORS, endpoint registration
├── routes/
│   ├── scout.py               # /api/scout/ask, /api/scout/send-to-sim
│   ├── video.py               # /api/video/* (stubs)
│   └── simulator.py           # /api/simulator/* (stubs + simulation logic)
├── services/
│   ├── gemini_client.py       # google-genai client initialization
│   ├── chirp_client.py        # Google STT / Chirp integration
│   ├── grounding.py           # source extraction, confidence scoring
│   ├── followup_parser.py     # FOLLOWUPS: token regex extraction
│   ├── intel_store.py         # shared in-memory store for send-to-sim
│   └── simulation.py          # court state management, game loop
├── session/
│   └── store.py               # in-memory session dict + history builder
├── prompts/
│   ├── scout_system.py        # SCOUT_SYSTEM_PROMPT constant
│   └── pilot_system.py        # AI pilot personality prompt
├── Dockerfile
├── requirements.txt
└── README.md
```

---

## Error Handling

| Condition | HTTP Code | Response |
|---|---|---|
| Gemini API timeout | 200 (graceful) | `{"answer": "Scouting request timed out. Please try again.", "confidence": 0, ...}` |
| Chirp STT failure | 200 (graceful) | Falls back to typed input prompt |
| Empty or invalid question | 400 | `{"detail": "Question is required"}` |
| Gemini rate limit | 429 | `{"detail": "Rate limit hit. Retry after X seconds"}` |
| Unhandled exception | 500 | Generic message logged to Cloud Run, not exposed to client |

---

## Frontend Integration

| Detail | Value |
|---|---|
| Local base URL | `http://localhost:8000` |
| Deployed base URL | Cloud Run URL (set as env var in frontend) |
| Content type | `application/json` on all endpoints |
| CORS | Open (`allow_origins=["*"]`) — no issues from any frontend origin |
| Swagger docs | `/docs` — full interactive API explorer |
| Session IDs | Client-generated. Recommended: `scout_${Date.now()}` |
| Voice input | Chirp transcript passed as `question` field — same endpoint, no special handling |
| `coach_context` | Optional — system works without it, better with it |

---

## Disclaimer

> Built at the Frontiers Gen-AI Hackathon. Educational and demonstration purposes. Not intended for use in real game strategy decisions without independent verification of statistics.
