import os
import json
import tempfile
import subprocess
import logging
import time
from pathlib import Path

from app.schemas import VideoAnalyzeRequest, VideoAnalyzeResponse

logger = logging.getLogger(__name__)

# In-memory cache: video_url -> (bytes, mime_type, cached_at)
_video_bytes_cache: dict[str, tuple[bytes, str, float]] = {}
CACHE_TTL_SECONDS = 3600  # 1 hour


def _build_upload_prompt(
    message: str | None,
    timestamp: str | None = None,
    history: list[dict[str, str]] | None = None,
) -> str:
    base = (
        "You are an elite basketball video analyst for coaching staff.\n"
        "Analyze the video and produce ONLY valid JSON.\n"
        "Do not include markdown fences.\n"
        "JSON schema:\n"
        "{\n"
        '  "answer": "string - concise one-line answer to coach message",\n'
        '  "confidence": 0.0\n'
        "}\n"
        "Rules:\n"
        "- 'answer' must be ONE concise sentence directly answering the coach's question.\n"
        "- If a timestamp is provided, focus analysis on that specific moment in the video.\n"
        "- confidence must be between 0 and 1.\n"
        "- Do NOT include summary, key_moments, patterns, weaknesses, or follow_up_suggestions unless explicitly requested."
    )
    history_text = ""
    if history:
        rendered = [f"- {t.get('role', 'coach')}: {t.get('content', '')}" for t in history]
        history_text = "Previous chat context:\n" + "\n".join(rendered)

    parts = [base, history_text]
    if timestamp:
        parts.append(f"Analyze specifically at timestamp: {timestamp}")
    if message:
        parts.append(f"Coach question: {message}")

    return "\n".join(p for p in parts if p).strip()


def _download_youtube_video(youtube_url: str) -> tuple[bytes, str]:
    """Download via yt-dlp, trim to max duration, return (bytes, mime_type)."""
    max_duration = int(os.getenv("VIDEO_MAX_DURATION_SECONDS", "180"))

    with tempfile.TemporaryDirectory() as tmpdir:
        output_template = str(Path(tmpdir) / "video.%(ext)s")
        trimmed_output = str(Path(tmpdir) / "trimmed.mp4")

        cmd = [
            "yt-dlp", "--quiet", "--no-warnings",
            "--format", "worst[ext=mp4]/worst",
            "--output", output_template,
            youtube_url,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            raise RuntimeError(f"yt-dlp failed: {result.stderr}")

        downloaded_files = list(Path(tmpdir).glob("video.*"))
        if not downloaded_files:
            raise RuntimeError("yt-dlp produced no output file")

        video_path = downloaded_files[0]
        trim_cmd = [
            "ffmpeg", "-i", str(video_path),
            "-t", str(max_duration), "-c", "copy", "-y",
            trimmed_output,
        ]
        trim_result = subprocess.run(trim_cmd, capture_output=True, text=True, timeout=60)
        final_path = (
            Path(trimmed_output)
            if trim_result.returncode == 0 and Path(trimmed_output).exists()
            else video_path
        )
        return final_path.read_bytes(), "video/mp4"


def _get_cached_video_bytes(video_url: str) -> tuple[bytes, str] | None:
    if video_url in _video_bytes_cache:
        cached_bytes, mime_type, cached_time = _video_bytes_cache[video_url]
        if time.time() - cached_time < CACHE_TTL_SECONDS:
            age = int(time.time() - cached_time)
            logger.info("✅ Cache hit (age: %ds, size: %d bytes)", age, len(cached_bytes))
            return cached_bytes, mime_type
        logger.info("❌ Cache expired, re-downloading...")
        del _video_bytes_cache[video_url]
    return None


def _call_gemini(video_bytes: bytes, mime_type: str, prompt: str) -> VideoAnalyzeResponse:
    """Send video bytes + text prompt to Gemini, parse JSON response."""
    import google.genai as genai
    from google.genai import types

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")

    client = genai.Client(api_key=api_key)
    model = os.getenv("VIDEO_ANALYZER_MODEL", "gemini-2.5-pro")

    t0 = time.time()
    logger.info("🤖 Gemini inference starting (model=%s)...", model)
    response = client.models.generate_content(
        model=model,
        contents=[
            types.Part.from_text(text=prompt),
            types.Part.from_bytes(data=video_bytes, mime_type=mime_type),
        ],
    )
    logger.info("✅ Gemini inference took %.2fs", time.time() - t0)

    text = (getattr(response, "text", "") or "").strip()
    if not text:
        raise RuntimeError("Gemini returned an empty response")

    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()

    data = json.loads(text)
    if isinstance(data, dict):
        data.setdefault("provider", "gemini")
    return VideoAnalyzeResponse(**data)


def _gemini_response(payload: VideoAnalyzeRequest) -> VideoAnalyzeResponse:
    total_start = time.time()

    cached = _get_cached_video_bytes(str(payload.youtube_url))
    if cached:
        video_bytes, mime_type = cached
        download_duration = 0.0
    else:
        t0 = time.time()
        video_bytes, mime_type = _download_youtube_video(str(payload.youtube_url))
        download_duration = time.time() - t0
        logger.info("⬇️  Download took %.2fs", download_duration)
        _video_bytes_cache[str(payload.youtube_url)] = (video_bytes, mime_type, time.time())

    history_list = (
        [{"role": t.role, "content": t.content} for t in payload.history]
        if payload.history else []
    )
    prompt = _build_upload_prompt(payload.message, payload.timestamp, history_list)
    result = _call_gemini(video_bytes, mime_type, prompt)

    logger.info(
        "⏱️  Total: %.2fs (download: %.2fs)",
        time.time() - total_start,
        download_duration,
    )
    return result


def _gemini_upload_response(
    *,
    video_bytes: bytes,
    mime_type: str,
    message: str | None,
    timestamp: str | None = None,
    history: list[dict[str, str]] | None = None,
) -> VideoAnalyzeResponse:
    prompt = _build_upload_prompt(message, timestamp, history)
    return _call_gemini(video_bytes, mime_type, prompt)


def analyze_video(payload: VideoAnalyzeRequest) -> VideoAnalyzeResponse:
    try:
        return _gemini_response(payload)
    except Exception as exc:
        raise RuntimeError(f"Video analyze failed: {exc}") from exc


def analyze_video_upload(
    *,
    video_bytes: bytes,
    mime_type: str,
    message: str | None = None,
    timestamp: str | None = None,
    history: list[dict[str, str]] | None = None,
) -> VideoAnalyzeResponse:
    try:
        return _gemini_upload_response(
            video_bytes=video_bytes,
            mime_type=mime_type,
            message=message,
            timestamp=timestamp,
            history=history,
        )
    except Exception as exc:
        raise RuntimeError(f"Video upload analyze failed: {exc}") from exc
