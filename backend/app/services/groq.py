import logging

import httpx

from app.core.config import get_settings
from app.services.risk import classify_risk

logger = logging.getLogger(__name__)

SAFE_FALLBACK = (
    "Eu não consegui acessar a IA agora. Se você estiver em risco imediato, ligue para "
    "o serviço de emergência local ou procure alguém de confiança. No Brasil, o CVV atende "
    "pelo 188. Posso continuar aqui com uma orientação simples: respire devagar, afaste "
    "objetos perigosos e tente ficar perto de outra pessoa."
)

SYSTEM_PROMPT = (
    "Você é Bergmann, uma IA de suporte emocional. Responda em português do Brasil com "
    "empatia, baixa carga cognitiva e orientação segura. Nunca substitua diagnóstico, terapia "
    "ou atendimento médico. Se houver possível crise, incentive contato humano, CVV 188 no "
    "Brasil e emergência local. Não dê instruções perigosas."
)


async def ask_bergmann(message: str) -> tuple[str, str, bool]:
    settings = get_settings()
    risk_level = classify_risk(message)
    if not settings.groq_api_key:
        logger.error("Groq unavailable: GROQ_API_KEY is not configured")
        return SAFE_FALLBACK, risk_level, True

    try:
        async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json={
                    "model": settings.groq_model,
                    "temperature": settings.ai_temperature,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": message},
                    ],
                },
            )
            response.raise_for_status()
            data = response.json()
            answer = data["choices"][0]["message"]["content"].strip()
            return answer, risk_level, False
    except Exception as exc:
        logger.error("Groq request failed: %s", exc.__class__.__name__)
        return SAFE_FALLBACK, risk_level, True
