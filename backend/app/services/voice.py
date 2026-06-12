from __future__ import annotations

import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

DEFAULT_TRANSCRIPTION_MODEL = "whisper-large-v3"

SUPPORTED_LANGUAGE_MAP = {
    "pt-BR": "pt",
    "pt": "pt",
    "en": "en",
    "es": "es",
}


def normalize_transcription_language(language: str | None) -> str | None:
    if not language:
        return None
    normalized = language.strip()
    if not normalized:
        return None
    return SUPPORTED_LANGUAGE_MAP.get(normalized)


async def transcribe_voice_audio(
    *,
    audio_bytes: bytes,
    filename: str,
    content_type: str | None,
    language: str | None = None,
) -> str:
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")

    normalized_language = normalize_transcription_language(language)
    files = {"file": (filename, audio_bytes, content_type or "application/octet-stream")}
    data: dict[str, str] = {
        "model": DEFAULT_TRANSCRIPTION_MODEL,
        "response_format": "json",
    }
    if normalized_language:
        data["language"] = normalized_language

    async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            files=files,
            data=data,
        )
        response.raise_for_status()

    try:
        payload = response.json()
    except ValueError:
        logger.warning("Groq transcription returned non-JSON response")
        return response.text.strip()

    if isinstance(payload, dict):
        transcript = payload.get("text") or payload.get("transcript") or ""
        return str(transcript).strip()

    return str(payload).strip()
