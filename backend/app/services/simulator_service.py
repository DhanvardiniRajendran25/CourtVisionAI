import json
import logging
import os

from openai import OpenAI

from app.prompts.simulator_system import SIMULATOR_SYSTEM_PROMPT
from app.schemas import (
    GameState,
    PlayItem,
    SimActionRequest,
    SimContinueRequest,
    SimResponse,
    SimStartRequest,
)
from app.services.scout_service import intel_store

logger = logging.getLogger(__name__)

# In-memory session store: sim_sessions[session_id] = list of conversation turns
sim_sessions: dict[str, list[dict]] = {}

SCENARIO_PROMPTS = {
    "clutch_time": "Q4, 5:00 remaining. {team_a} 65 - {team_b} 68. Close game, every possession matters.",
    "full_game": "Start from tip-off, Q1 12:00. Score is 0-0.",
    "comeback": "{team_a} is down 15 with 8:00 left in Q3. They need a big run.",
}


def _get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY environment variable is not set")
    return OpenAI(api_key=api_key)


def _parse_sim_json(text: str) -> dict:
    """Parse JSON response, stripping markdown backticks if present."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        clean = text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean)


def _build_sim_response(data: dict, session_id: str) -> SimResponse:
    plays = [PlayItem(**p) for p in data.get("plays", [])]
    game_state = GameState(**data["game_state"])
    return SimResponse(plays=plays, game_state=game_state, session_id=session_id)


def _build_messages(history: list[dict], system_prompt: str) -> list[dict]:
    """Build full OpenAI messages list from system prompt + conversation history."""
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    return messages


def start_simulation(request: SimStartRequest) -> SimResponse:
    """
    Two OpenAI calls:
      1. Web search — fetch real current-season stats for both teams
      2. Simulation — JSON play-by-play using those stats + scout intel + coach context
    """
    client = _get_client()
    model = os.getenv("OPENAI_SCOUT_MODEL", "gpt-4o")
    session_id = request.session_id or "default"

    # --- Call 1: Web search stat fetch ---
    stat_query = (
        f"Current 2025-2026 season stats for {request.team_a} and {request.team_b} basketball. "
        "Rosters, records, key player stats, shooting percentages, pace, strengths and weaknesses."
    )
    stat_response = client.responses.create(
        model=model,
        tools=[{"type": "web_search_preview"}],
        input=stat_query,
        temperature=0.1,
        max_output_tokens=2000,
    )
    team_data = stat_response.output_text or f"Stats for {request.team_a} and {request.team_b} unavailable."

    # --- Load scout intel for opponent ---
    scout_intel = intel_store.get(request.team_b, "No scout intel available.")

    # --- Build coach context block ---
    coach_block = ""
    if request.coach_context:
        ctx = request.coach_context
        if ctx.injured_players:
            coach_block += f"\nINJURED_PLAYERS (do NOT play them): {', '.join(ctx.injured_players)}"
        if ctx.style:
            coach_block += f"\nCOACH STYLE: {ctx.style}"

    # --- Scenario ---
    scenario_template = SCENARIO_PROMPTS.get(request.scenario, SCENARIO_PROMPTS["clutch_time"])
    scenario_desc = scenario_template.format(team_a=request.team_a, team_b=request.team_b)

    sim_prompt = (
        f"TEAM DATA:\n{team_data}\n\n"
        f"SCOUT INTEL:\n{scout_intel}"
        f"{coach_block}\n\n"
        f"TEAM A: {request.team_a}\n"
        f"TEAM B (Opponent): {request.team_b}\n\n"
        f"SCENARIO: {scenario_desc}\n\n"
        f"Begin simulation. Generate 6-8 possessions."
    )

    # --- Call 2: Simulation (no search tool, JSON output) ---
    sim_response = client.responses.create(
        model=model,
        input=[
            {"role": "system", "content": SIMULATOR_SYSTEM_PROMPT},
            {"role": "user", "content": sim_prompt},
        ],
        temperature=0.7,
        max_output_tokens=4000,
    )

    raw_text = sim_response.output_text or "{}"
    data = _parse_sim_json(raw_text)

    # Store conversation for multi-turn continuations (no system prompt in history)
    sim_sessions[session_id] = [
        {"role": "user", "content": sim_prompt},
        {"role": "assistant", "content": raw_text},
    ]

    return _build_sim_response(data, session_id)


def apply_action(request: SimActionRequest) -> SimResponse:
    """Coach makes a tactical call — append it and generate the next chunk."""
    client = _get_client()
    model = os.getenv("OPENAI_SCOUT_MODEL", "gpt-4o")
    session_id = request.session_id

    if session_id not in sim_sessions:
        raise KeyError(f"Session '{session_id}' not found. Start a simulation first.")

    history = sim_sessions[session_id]
    coach_msg = f"COACH DECISION: {request.action}\nSimulate next 6-8 possessions reflecting this tactical change."

    messages = _build_messages(history, SIMULATOR_SYSTEM_PROMPT)
    messages.append({"role": "user", "content": coach_msg})

    response = client.responses.create(
        model=model,
        input=messages,
        temperature=0.7,
        max_output_tokens=4000,
    )

    raw_text = response.output_text or "{}"
    data = _parse_sim_json(raw_text)

    # Update session history
    sim_sessions[session_id].append({"role": "user", "content": coach_msg})
    sim_sessions[session_id].append({"role": "assistant", "content": raw_text})

    return _build_sim_response(data, session_id)


def continue_simulation(request: SimContinueRequest) -> SimResponse:
    """No coach intervention — just generate the next chunk."""
    client = _get_client()
    model = os.getenv("OPENAI_SCOUT_MODEL", "gpt-4o")
    session_id = request.session_id

    if session_id not in sim_sessions:
        raise KeyError(f"Session '{session_id}' not found. Start a simulation first.")

    history = sim_sessions[session_id]
    continue_msg = "Continue simulation. Next 6-8 possessions."

    messages = _build_messages(history, SIMULATOR_SYSTEM_PROMPT)
    messages.append({"role": "user", "content": continue_msg})

    response = client.responses.create(
        model=model,
        input=messages,
        temperature=0.7,
        max_output_tokens=4000,
    )

    raw_text = response.output_text or "{}"
    data = _parse_sim_json(raw_text)

    sim_sessions[session_id].append({"role": "user", "content": continue_msg})
    sim_sessions[session_id].append({"role": "assistant", "content": raw_text})

    return _build_sim_response(data, session_id)
