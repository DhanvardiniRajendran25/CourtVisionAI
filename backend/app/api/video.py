import json

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from pydantic import ValidationError

from app.schemas import VideoAnalyzeRequest, VideoAnalyzeResponse
from app.services.video_analyzer import analyze_video, analyze_video_upload

router = APIRouter(prefix="/api/video", tags=["video"])


@router.post("/analyze", response_model=VideoAnalyzeResponse)
async def video_analyze(request: Request) -> VideoAnalyzeResponse:
    content_type = (request.headers.get("content-type") or "").lower()
    try:
        if "application/json" in content_type:
            body = await request.json()
            payload = VideoAnalyzeRequest(**body)
            return analyze_video(payload)

        if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
            form = await request.form()

            # message field (backward compat: also accepts 'question')
            message_value = form.get("message")
            message = message_value if isinstance(message_value, str) else None
            if not message:
                q = form.get("question")
                if isinstance(q, str):
                    message = q

            timestamp_value = form.get("timestamp")
            timestamp = timestamp_value if isinstance(timestamp_value, str) else None

            history: list[dict[str, str]] = []
            history_value = form.get("history")
            if isinstance(history_value, str) and history_value.strip():
                try:
                    parsed = json.loads(history_value)
                    if isinstance(parsed, list):
                        history = parsed
                except json.JSONDecodeError as exc:
                    raise HTTPException(status_code=400, detail=f"Invalid history JSON: {exc}") from exc

            file_value = form.get("video_file")
            if isinstance(file_value, UploadFile):
                file_bytes = await file_value.read()
                if not file_bytes:
                    raise HTTPException(status_code=400, detail="Uploaded file is empty.")
                mime_type = file_value.content_type or "video/mp4"
                return analyze_video_upload(
                    video_bytes=file_bytes,
                    mime_type=mime_type,
                    message=message,
                    timestamp=timestamp,
                    history=history,
                )

            youtube_url_value = form.get("youtube_url")
            if isinstance(youtube_url_value, str) and youtube_url_value.strip():
                payload = VideoAnalyzeRequest(
                    youtube_url=youtube_url_value.strip(),
                    message=message,
                    timestamp=timestamp,
                    history=history,
                )
                return analyze_video(payload)

            raise HTTPException(
                status_code=400,
                detail="Provide either 'youtube_url' or 'video_file' in the request body.",
            )

        raise HTTPException(
            status_code=415,
            detail="Unsupported content type. Use application/json or multipart/form-data.",
        )
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON body: {exc}") from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Video analyze failed: {exc}") from exc


# Backward-compat route for typo in older dev notes
@router.post("/analyhze", response_model=VideoAnalyzeResponse)
async def video_analyhze(request: Request) -> VideoAnalyzeResponse:
    return await video_analyze(request)


@router.post("/analyze/upload", response_model=VideoAnalyzeResponse)
async def video_analyze_upload_endpoint(
    message: str | None = Form(default=None),
    question: str | None = Form(default=None),
    timestamp: str | None = Form(default=None),
    history: str | None = Form(default=None),
    video_file: UploadFile = File(...),
) -> VideoAnalyzeResponse:
    try:
        file_bytes = await video_file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        mime_type = video_file.content_type or "video/mp4"
        effective_message = message or question
        parsed_history: list[dict[str, str]] = []
        if history:
            try:
                loaded = json.loads(history)
                if isinstance(loaded, list):
                    parsed_history = loaded
            except json.JSONDecodeError as exc:
                raise HTTPException(status_code=400, detail=f"Invalid history JSON: {exc}") from exc

        return analyze_video_upload(
            video_bytes=file_bytes,
            mime_type=mime_type,
            message=effective_message,
            timestamp=timestamp,
            history=parsed_history,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Video upload analyze failed: {exc}") from exc
