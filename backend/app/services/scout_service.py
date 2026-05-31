import json
import os
import re

from openai import OpenAI

from app.prompts.scout_system import SCOUT_SYSTEM_PROMPT
from app.schemas import CoachContext, ScoutRequest, ScoutResponse, SendToSimRequest, SendToSimResponse, SourceItem

# ---------------------------------------------------------------------------
# In-memory stores — shared across the app process
# ---------------------------------------------------------------------------

# sessions["session_id"] = [{"role": "user"|"assistant", "content": "..."}]
sessions: dict[str, list[dict]] = {}

# intel_store["TeamName"] = "compiled scouting brief..."
# Simulator router imports this dict to read scout intel.
intel_store: dict[str, str] = {}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY environment variable is not set")
    return OpenAI(api_key=api_key)


def _calculate_confidence(num_sources: int, prior_model_turns: int = 0) -> float:
    """Derive confidence score from number of search result sources returned."""
    if num_sources == 0:
        return 0.75 if prior_model_turns >= 3 else 0.5
    if num_sources >= 3:
        return 0.9
    elif num_sources == 2:
        return 0.8
    elif num_sources == 1:
        return 0.7
    return 0.5


def _extract_followups(answer_text: str) -> tuple[str, list[str]]:
    """Parse FOLLOWUPS: [...] from model response. Returns (clean_answer, followups)."""
    followups: list[str] = []
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
            "What's their record in away games?",
        ]

    return clean_answer, followups


def _build_messages(session_history: list[dict], new_question: str, system_instruction: str) -> list[dict]:
    """Build OpenAI messages list from session history + new question."""
    messages = [{"role": "system", "content": system_instruction}]
    for msg in session_history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": new_question})
    return messages


def _build_system_instruction(coach_context: CoachContext | None) -> str:
    """Append coach context to the base system prompt when provided."""
    if not coach_context:
        return SCOUT_SYSTEM_PROMPT

    context_lines = []
    if coach_context.team:
        context_lines.append(f"The coach's own team: {coach_context.team}")
    if coach_context.injured_players:
        names = ", ".join(coach_context.injured_players)
        context_lines.append(f"INJURED PLAYERS — do NOT suggest strategies using: {names}")
    if coach_context.style:
        context_lines.append(f"Team play style: {coach_context.style}")

    context_block = "\n".join(context_lines)
    return f"{SCOUT_SYSTEM_PROMPT}\n\nCOACH CONTEXT:\n{context_block}"


def _extract_sources_from_response(response) -> tuple[list[SourceItem], list[str]]:
    """Extract web search citations and queries from an OpenAI response."""
    sources: list[SourceItem] = []
    search_queries: list[str] = []

    for item in response.output:
        # web_search_call items contain the query used
        if item.type == "web_search_call":
            # The query isn't always directly exposed — capture it if available
            pass
        # message items contain the text and inline citations
        if item.type == "message":
            for annotation in getattr(item.content[0], "annotations", []):
                if annotation.type == "url_citation":
                    sources.append(SourceItem(
                        title=getattr(annotation, "title", annotation.url) or annotation.url,
                        uri=annotation.url,
                    ))

    # Deduplicate sources by URI
    seen = set()
    unique_sources = []
    for s in sources:
        if s.uri not in seen:
            seen.add(s.uri)
            unique_sources.append(s)

    return unique_sources, search_queries


# ---------------------------------------------------------------------------
# Core service functions
# ---------------------------------------------------------------------------

def ask_scout(request: ScoutRequest) -> ScoutResponse:
    """Call OpenAI with web_search_preview tool for a basketball scouting question."""
    client = _get_client()
    session_id = request.session_id or "default"

    if session_id not in sessions:
        sessions[session_id] = []

    session_history = sessions[session_id]
    system_instruction = _build_system_instruction(request.coach_context)
    messages = _build_messages(session_history, request.question, system_instruction)
    model = os.getenv("OPENAI_SCOUT_MODEL", "gpt-4o")

    response = client.responses.create(
        model=model,
        tools=[{"type": "web_search_preview"}],
        input=messages,
        temperature=0.2,
        max_output_tokens=3000,
    )

    answer_raw = response.output_text or ""
    sources, search_queries = _extract_sources_from_response(response)

    prior_model_turns = sum(1 for m in session_history if m["role"] == "assistant")
    confidence = _calculate_confidence(len(sources), prior_model_turns)
    clean_answer, followups = _extract_followups(answer_raw)

    # Persist to session history (OpenAI roles: "user" / "assistant")
    sessions[session_id].append({"role": "user", "content": request.question})
    sessions[session_id].append({"role": "assistant", "content": clean_answer})

    return ScoutResponse(
        answer=clean_answer,
        confidence=confidence,
        sources=sources,
        search_queries=search_queries,
        suggested_followups=followups,
        session_id=session_id,
    )


def compile_intel(request: SendToSimRequest) -> SendToSimResponse:
    """Compile all assistant responses from a scout session into a tactical brief for the Simulator."""
    client = _get_client()
    team = request.team
    session_history = sessions.get(request.session_id, [])

    model_responses = [msg["content"] for msg in session_history if msg["role"] == "assistant"]

    if not model_responses:
        intel_summary = f"No scouting data found for session '{request.session_id}'. Scout {team} first."
        intel_store[team] = intel_summary
        return SendToSimResponse(intel_summary=intel_summary, status="ready_for_simulator")

    combined = "\n\n---\n\n".join(model_responses)
    compile_prompt = (
        f"Compile this scouting conversation into a concise tactical intel brief about {team}. "
        "Use bullet points. Include: strengths, weaknesses, key players, tendencies, and exploitable patterns.\n\n"
        f"SCOUTING DATA:\n{combined}"
    )

    model = os.getenv("OPENAI_SCOUT_MODEL", "gpt-4o")
    response = client.responses.create(
        model=model,
        input=compile_prompt,
        temperature=0.1,
        max_output_tokens=1500,
    )

    intel_summary = response.output_text or f"Unable to compile intel for {team}."
    intel_store[team] = intel_summary

    return SendToSimResponse(intel_summary=intel_summary, status="ready_for_simulator")
