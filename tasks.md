# TASKS.md — Scout Agent Backend (2-Hour Sprint)

## Timeline Overview

| Block | Time | What | Done? |
|-------|------|------|-------|
| 1 | 0:00–0:15 | Project scaffold + FastAPI boilerplate + all stubs | ☐ |
| 2 | 0:15–0:25 | Pydantic schemas + system prompt file | ☐ |
| 3 | 0:25–0:50 | `/api/scout/ask` — core endpoint with Gemini + Search Grounding | ☐ |
| 4 | 0:50–1:05 | Multi-turn session memory + follow-up extraction + confidence score | ☐ |
| 5 | 1:05–1:15 | `/api/scout/send-to-sim` endpoint | ☐ |
| 6 | 1:15–1:30 | Test all endpoints manually (Swagger UI or curl) + fix bugs | ☐ |
| 7 | 1:30–1:45 | Error handling + edge cases + Dockerfile | ☐ |
| 8 | 1:45–2:00 | Deploy to Cloud Run + verify live URL + share with frontend team | ☐ |

---

## Block 1 (0:00–0:15): Scaffold

### Task 1.1 — Init project
- [ ] Create project folder, venv, install deps
- [ ] `pip install fastapi uvicorn google-genai python-dotenv pydantic`
- [ ] Create `.env` with `GEMINI_API_KEY`
- [ ] Create `requirements.txt`

### Task 1.2 — main.py
- [ ] FastAPI app with CORS (allow all origins)
- [ ] Include 3 routers: scout, video_analyzer, simulator
- [ ] `/health` endpoint
- [ ] Verify: `uvicorn main:app --reload` runs, `/docs` shows Swagger

### Task 1.3 — Stub routers for teammates
- [ ] `routers/video_analyzer.py` — stub `POST /analyze` and `POST /followup` returning `{"status": "not_implemented"}`
- [ ] `routers/simulator.py` — stub `POST /start`, `POST /action`, `POST /continue` returning `{"status": "not_implemented"}`

**✅ Checkpoint:** Server runs. All routes visible at `/docs`. Share with frontend team NOW so they can start wiring.

---

## Block 2 (0:15–0:25): Schemas + Prompt

### Task 2.1 — Pydantic models
- [ ] `models/schemas.py` with:
  - `CoachContext` (optional team, injured_players, style)
  - `ScoutRequest` (question, session_id, coach_context)
  - `ScoutResponse` (answer, confidence, sources, search_queries, suggested_followups, session_id)
  - `SourceItem` (title, uri)
  - `SendToSimRequest` (session_id, team)
  - `SendToSimResponse` (intel_summary, status)

### Task 2.2 — System prompt
- [ ] `prompts/scout_system.py` containing `SCOUT_SYSTEM_PROMPT` string
- [ ] Prompt must instruct model to:
  - Use real current-season stats
  - Cite specific numbers
  - Respect injured players from coach_context
  - End response with `FOLLOWUPS: ["q1", "q2", "q3"]`
  - Rate confidence as High/Medium/Low

**✅ Checkpoint:** Schemas importable. Prompt string ready.

---

## Block 3 (0:25–0:50): Core Scout Endpoint ⚡ CRITICAL

### Task 3.1 — Gemini client setup
- [ ] In `routers/scout.py`, init Gemini client:
  ```python
  from google import genai
  from google.genai import types
  client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
  ```
- [ ] Define google search tool:
  ```python
  search_tool = types.Tool(google_search=types.GoogleSearch())
  ```

### Task 3.2 — `/api/scout/ask` basic version
- [ ] Accept `ScoutRequest` body
- [ ] Build system instruction that injects `coach_context` if provided
- [ ] Call `client.models.generate_content()` with:
  - model: `"gemini-2.5-flash"`
  - contents: the question (single turn first, multi-turn in Block 4)
  - config: system_instruction, tools=[search_tool], temperature=0.2, max_output_tokens=3000
- [ ] Extract `response.text` as the answer
- [ ] Extract sources from `response.candidates[0].grounding_metadata.grounding_chunks`
- [ ] Extract search queries from `response.candidates[0].grounding_metadata.web_search_queries`
- [ ] Return `ScoutResponse`

### Task 3.3 — Test basic flow
- [ ] Open `/docs`, send: `{"question": "What is Duke's record this season?"}`
- [ ] Verify: answer has real stats, sources array is populated, search_queries present
- [ ] If grounding_metadata is None → double check tool config

**✅ Checkpoint:** Scout answers questions with real grounded stats. Sources visible. This is the MVP.

---

## Block 4 (0:50–1:05): Session Memory + Helpers

### Task 4.1 — Session store
- [ ] Module-level dict: `sessions: dict[str, list[dict]] = {}`
- [ ] Before Gemini call, load session history and build `contents` list with all previous turns as `types.Content` objects
- [ ] After Gemini response, append both user question and model answer to session
- [ ] Test: ask "What's Duke's weakness?", then ask "How about their free throws?" → second answer should have context from first

### Task 4.2 — Follow-up extraction
- [ ] Parse `FOLLOWUPS: [...]` from end of model response using regex
- [ ] Strip it from the answer text so frontend gets clean text
- [ ] Fallback: if parsing fails, return 3 generic basketball follow-ups

### Task 4.3 — Confidence score
- [ ] Calculate from grounding metadata: count `grounding_chunks`
  - 3+ sources → 0.9
  - 2 → 0.8
  - 1 → 0.7
  - 0 → 0.5

**✅ Checkpoint:** Multi-turn works. Follow-ups extracted. Confidence scores present.

---

## Block 5 (1:05–1:15): Send-to-Sim Endpoint

### Task 5.1 — Intel compiler
- [ ] `POST /api/scout/send-to-sim` endpoint
- [ ] Grab all model responses from the session history for given `session_id`
- [ ] Concatenate them and send to Gemini Flash with prompt:
  "Compile this scouting data into a concise tactical brief about {team}. Use bullet points. Include: strengths, weaknesses, key players, tendencies, exploitable patterns."
- [ ] Store result in a shared dict `intel_store[team]` that Simulator router can import and read
- [ ] Return `SendToSimResponse`

### Task 5.2 — Intel read endpoint (for Simulator)
- [ ] `GET /api/scout/intel/{team}` — returns stored intel if exists, 404 if not
- [ ] This lets the Simulator endpoint fetch scout intel when starting a game

**✅ Checkpoint:** Scout → Simulator data pipeline works.

---

## Block 6 (1:15–1:30): Testing

### Task 6.1 — Full flow test
- [ ] Fresh session: ask 3 questions about the same team, verify context carries
- [ ] Check all response fields populated: answer, confidence, sources, search_queries, suggested_followups
- [ ] Test send-to-sim: verify intel summary is coherent
- [ ] Test with coach_context: verify AI adapts (e.g., doesn't suggest playing injured player)
- [ ] Test edge cases:
  - Empty question → should return 400
  - Very long question → should still work
  - Non-basketball question → AI should still try but confidence will be low

### Task 6.2 — Fix any bugs found

**✅ Checkpoint:** All endpoints working correctly. Edge cases handled.

---

## Block 7 (1:30–1:45): Hardening + Docker

### Task 7.1 — Error handling
- [ ] Wrap Gemini calls in try/except
- [ ] Handle `google.genai.errors.APIError` → return 502
- [ ] Handle timeout scenarios → return 504 with message
- [ ] Handle empty/None grounding_metadata gracefully (don't crash)
- [ ] Add request timeout: if Gemini takes >30s, abort

### Task 7.2 — Dockerfile
- [ ] Create Dockerfile (python:3.11-slim, copy, pip install, uvicorn on port 8080)
- [ ] Create `.dockerignore` (venv, .env, __pycache__)
- [ ] Test local docker build if time permits:
  ```bash
  docker build -t courtvision .
  docker run -p 8080:8080 -e GEMINI_API_KEY=your-key courtvision
  ```

**✅ Checkpoint:** Backend is crash-proof. Docker image ready.

---

## Block 8 (1:45–2:00): Deploy + Handoff

### Task 8.1 — Cloud Run deploy
- [ ] ```bash
      gcloud run deploy courtvision-api \
        --source . \
        --region us-central1 \
        --allow-unauthenticated \
        --set-env-vars "GEMINI_API_KEY=your-key" \
        --memory 1Gi \
        --timeout 300
      ```
- [ ] Note the deployed URL (e.g., `https://courtvision-api-xxxxx.run.app`)
- [ ] Hit `/health` on live URL to verify
- [ ] Hit `/api/scout/ask` on live URL to verify grounding works

### Task 8.2 — Handoff to frontend team
- [ ] Share deployed Cloud Run URL
- [ ] Share Swagger docs link: `{CLOUD_RUN_URL}/docs`
- [ ] Confirm CORS works from their frontend dev server
- [ ] Quick walkthrough of request/response format

### Task 8.3 — Hand off stubs to teammates
- [ ] Tell Video Analyzer person: your endpoints are at `routers/video_analyzer.py`, schemas go in `models/schemas.py`, Gemini client pattern is in `routers/scout.py` — copy it
- [ ] Tell Simulator person: same, plus `intel_store` dict is how you read scout data

**✅ DONE.** Backend live. Frontend can integrate. Teammates can build their features on top.

---

## If You're Running Behind

**Cut at 1:15 if needed.** Skip send-to-sim (Block 5) and hardening (Block 7). The core scout endpoint (Blocks 1-4) + basic testing (Block 6) + deploy (Block 8) is what matters. Send-to-sim can be a simple dict pass-through added later in 5 minutes. Error handling can be minimal (just try/except around the Gemini call).

**Absolute minimum viable delivery:**
1. FastAPI server with `/health` and `/api/scout/ask`
2. Scout endpoint calls Gemini Flash with Google Search grounding
3. Returns answer + sources + confidence
4. Deployed to Cloud Run with a shareable URL

Everything else is polish.