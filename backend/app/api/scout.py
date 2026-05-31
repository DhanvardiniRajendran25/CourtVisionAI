import logging

from fastapi import APIRouter, HTTPException

from app.schemas import ScoutRequest, ScoutResponse, SendToSimRequest, SendToSimResponse
from app.services import scout_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scout", tags=["scout"])


@router.post("/ask", response_model=ScoutResponse)
def scout_ask(payload: ScoutRequest) -> ScoutResponse:
    """
    Ask a natural-language basketball scouting question.
    Returns a grounded answer backed by real current-season stats via Gemini + Google Search.
    Maintains multi-turn memory per session_id.
    """
    try:
        return scout_service.ask_scout(payload)
    except RuntimeError as exc:
        logger.error("Scout config error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error in /api/scout/ask")
        return ScoutResponse(
            answer="Scouting request failed. Please try again.",
            confidence=0.0,
            sources=[],
            search_queries=[],
            suggested_followups=[
                "Try asking about a specific team's record",
                "Ask about a player's recent performance",
                "Ask about upcoming matchup trends",
            ],
            session_id=payload.session_id or "default",
        )


@router.post("/send-to-sim", response_model=SendToSimResponse)
def scout_send_to_sim(payload: SendToSimRequest) -> SendToSimResponse:
    """
    Compile all scouting intel from a session into a tactical brief the Simulator can use.
    Stores result in intel_store so Simulator can retrieve it via GET /api/scout/intel/{team}.
    """
    try:
        return scout_service.compile_intel(payload)
    except RuntimeError as exc:
        logger.error("Scout send-to-sim config error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error in /api/scout/send-to-sim")
        raise HTTPException(status_code=500, detail="Failed to compile scouting intel.") from exc


@router.get("/intel/{team}")
def scout_get_intel(team: str) -> dict:
    """
    Retrieve compiled scouting intel for a team.
    Called by the Simulator when starting a game simulation.
    Returns 404 if no intel has been compiled for this team yet.
    """
    intel = scout_service.intel_store.get(team)
    if intel is None:
        raise HTTPException(
            status_code=404,
            detail=f"No scouting intel found for '{team}'. Run /api/scout/send-to-sim first.",
        )
    return {"team": team, "intel_summary": intel, "status": "ready_for_simulator"}
