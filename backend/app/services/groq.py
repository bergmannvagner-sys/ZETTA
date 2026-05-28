import logging
import re

import httpx

from app.core.config import get_settings
from app.services.risk import classify_risk
from app.services.scope import OFF_SCOPE_RESPONSE, is_in_emotional_scope

logger = logging.getLogger(__name__)

SAFE_FALLBACK = (
    "Eu não consegui acessar a IA agora. Se você estiver em risco imediato, ligue para "
    "o serviço de emergência local ou procure alguém de confiança. No Brasil, o CVV atende "
    "pelo 188. Posso continuar aqui com uma orientação simples: respire devagar, afaste "
    "objetos perigosos e tente ficar perto de outra pessoa."
)

SYSTEM_PROMPT = (
    "Você é Bergmann, uma IA de suporte emocional. Responda em português do Brasil com "
    "empatia, baixa carga cognitiva e orientação segura. Use no máximo 5 frases curtas. "
    "Não use Markdown, títulos, listas longas ou negrito. Nunca substitua diagnóstico, terapia "
    "ou atendimento médico. Se houver possível crise, incentive contato humano, CVV 188 no "
    "Brasil e emergência local. Não dê instruções perigosas. Se a mensagem pedir conteúdo "
    "fora de suporte emocional, responda brevemente, mantenha foco defensivo/seguro e convide "
    "a pessoa a falar sobre como ela está se sentindo."
)


def _clean_answer(answer: str) -> str:
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", answer)
    cleaned = re.sub(r"(?m)^\s*\d+\.\s+", "- ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    sentences = re.split(r"(?<=[.!?])\s+", cleaned)
    limited = " ".join(sentence for sentence in sentences[:5] if sentence).strip()
    if len(limited) > 700:
        limited = limited[:697].rstrip() + "..."
    return limited or SAFE_FALLBACK


async def ask_bergmann(message: str) -> tuple[str, str, bool, bool]:
    settings = get_settings()
    risk_level = classify_risk(message)
    if not is_in_emotional_scope(message):
        return OFF_SCOPE_RESPONSE, risk_level, False, False
    if not settings.groq_api_key:
        logger.error("Groq unavailable: GROQ_API_KEY is not configured")
        return SAFE_FALLBACK, risk_level, True, True

    try:
        async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json={
                    "model": settings.groq_model,
                    "temperature": settings.ai_temperature,
                    "max_tokens": 260,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": message},
                    ],
                },
            )
            response.raise_for_status()
            data = response.json()
            answer = _clean_answer(data["choices"][0]["message"]["content"].strip())
            return answer, risk_level, False, True
    except Exception as exc:
        logger.error("Groq request failed: %s", exc.__class__.__name__)
        return SAFE_FALLBACK, risk_level, True, True
