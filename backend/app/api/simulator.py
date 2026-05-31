import logging

from fastapi import APIRouter, HTTPException

from app.schemas import SimActionRequest, SimContinueRequest, SimResponse, SimStartRequest
from app.services import simulator_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/simulator", tags=["simulator"])


@router.post("/start", response_model=SimResponse)
def simulator_start(payload: SimStartRequest) -> SimResponse:
    """
    Start a game simulation.
    Makes two Gemini calls: (1) grounded stat fetch, (2) JSON play-by-play simulation.
    Injects scout intel from Scout Agent and coach pre-game context (injured players, style).
    """
    try:
        return simulator_service.start_simulation(payload)
    except RuntimeError as exc:
        logger.error("Simulator config error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error in /api/simulator/start")
        raise HTTPException(status_code=500, detail=f"Simulation failed to start: {exc}") from exc


@router.post("/action", response_model=SimResponse)
def simulator_action(payload: SimActionRequest) -> SimResponse:
    """
    Coach submits a tactical decision (e.g. 'Full court press').
    AI simulates the next 6-8 possessions reflecting that change.
    """
    try:
        return simulator_service.apply_action(payload)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.error("Simulator config error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error in /api/simulator/action")
        raise HTTPException(status_code=500, detail=f"Action failed: {exc}") from exc


@router.post("/continue", response_model=SimResponse)
def simulator_continue(payload: SimContinueRequest) -> SimResponse:
    """
    Continue simulation without coach intervention.
    AI generates the next 6-8 possessions.
    """
    try:
        return simulator_service.continue_simulation(payload)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.error("Simulator config error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error in /api/simulator/continue")
        raise HTTPException(status_code=500, detail=f"Continue failed: {exc}") from exc
