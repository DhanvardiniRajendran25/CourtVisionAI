from pydantic import BaseModel, Field, HttpUrl


class ChatTurn(BaseModel):
    role: str = Field(..., description="chat role, e.g. coach or assistant")
    content: str = Field(..., min_length=1)


class VideoAnalyzeRequest(BaseModel):
    youtube_url: HttpUrl = Field(..., description="Public YouTube game tape URL.")
    message: str | None = Field(
        default=None,
        description="Coach message / question about the video.",
        min_length=3,
    )
    timestamp: str | None = Field(
        default=None,
        description="Specific timestamp to focus on (e.g. '02:30', '1:45:30').",
        examples=["02:30", "1:45:30"],
    )
    history: list[ChatTurn] = Field(
        default_factory=list,
        description="Previous chat turns for multi-turn context.",
    )


class KeyMoment(BaseModel):
    timestamp: str = Field(..., examples=["05:30"])
    title: str = Field(..., examples=["Defensive rotation breakdown"])
    insight: str


class AnalysisPattern(BaseModel):
    name: str = Field(..., examples=["Pick and roll"])
    value: str = Field(..., examples=["40% of half-court sets"])
    confidence: float = Field(..., ge=0, le=1)


class VideoAnalyzeResponse(BaseModel):
    answer: str = Field(..., description="Concise direct answer to the coach's message")
    summary: str | None = Field(default=None)
    key_moments: list[KeyMoment] | None = Field(default=None)
    patterns: list[AnalysisPattern] | None = Field(default=None)
    weaknesses: list[str] | None = Field(default=None)
    follow_up_suggestions: list[str] | None = Field(default=None)
    confidence: float = Field(..., ge=0, le=1)
    provider: str = Field(..., examples=["mock", "gemini"])


class CoachContext(BaseModel):
    team: str | None = Field(default=None, description="Coach's own team name.")
    injured_players: list[str] = Field(default=[], description="Players unavailable — AI won't suggest strategies relying on them.")
    style: str | None = Field(default=None, description="Team play style (e.g. uptempo, half-court).")


class ScoutRequest(BaseModel):
    question: str = Field(..., min_length=3, description="Coach scouting question in plain English.")
    session_id: str = Field(default="default", description="Groups messages into a multi-turn conversation.")
    coach_context: CoachContext | None = Field(default=None, description="Optional coach team info for personalized advice.")


class SourceItem(BaseModel):
    title: str
    uri: str


class ScoutResponse(BaseModel):
    answer: str
    confidence: float = Field(..., ge=0, le=1)
    sources: list[SourceItem] = []
    search_queries: list[str] = []
    suggested_followups: list[str] = []
    session_id: str


class SendToSimRequest(BaseModel):
    session_id: str = Field(..., description="Scout session to compile intel from.")
    team: str = Field(..., description="Opponent team name.")


class SendToSimResponse(BaseModel):
    intel_summary: str
    status: str


# ---------------------------------------------------------------------------
# Simulator schemas
# ---------------------------------------------------------------------------

class SimCoachContext(BaseModel):
    injured_players: list[str] = Field(default=[], description="Players unavailable — AI will never put them on the court.")
    style: str | None = Field(default=None, description="e.g. 'uptempo', 'half-court', 'defensive'")


class SimStartRequest(BaseModel):
    team_a: str = Field(..., description="Coach's team.")
    team_b: str = Field(..., description="Opponent team.")
    scenario: str = Field(default="clutch_time", description="clutch_time | full_game | comeback")
    session_id: str = Field(default="default")
    scout_session_id: str | None = Field(default=None, description="Scout session to pull opponent intel from.")
    coach_context: SimCoachContext | None = Field(default=None, description="Pre-game tactics — injured players and play style.")


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
    action: str = Field(..., description="Coach's tactical decision (e.g. 'Full court press').")
    session_id: str


class SimContinueRequest(BaseModel):
    session_id: str
