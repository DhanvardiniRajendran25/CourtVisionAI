from dotenv import load_dotenv

load_dotenv(override=True)  # override=True forces .env to win over system env vars

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.scout import router as scout_router
from app.api.simulator import router as simulator_router
from app.api.video import router as video_router

app = FastAPI(
    title="CourtVision AI API",
    version="0.1.0",
    description="Backend routes for video analysis, scout, and simulator.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(video_router)
app.include_router(scout_router)
app.include_router(simulator_router)
