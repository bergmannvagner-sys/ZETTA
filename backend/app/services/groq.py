import logging
import re

import httpx

from app.core.config import get_settings
from app.services.risk import classify_risk
from app.services.scope import (
    DEPENDENCY_BOUNDARY_RESPONSE,
    UNSAFE_REQUEST_RESPONSE,
    is_criminal_instruction_request,
    is_dependency_seeking,
    is_safe_chat_request,
)

logger = logging.getLogger(__name__)

SAFE_FALLBACK = (
    "Eu nao consegui acessar a IA agora. Se voce estiver em risco imediato, ligue para "
    "o servico de emergencia local ou procure alguem de confianca. No Brasil, o CVV atende "
    "pelo 188. Posso continuar aqui com uma orientacao simples: respire devagar, afaste "
    "objetos perigosos e tente ficar perto de outra pessoa."
)

CRISIS_RESPONSE = (
    "Sinto muito que voce esteja passando por isso. Se houver risco imediato, ligue para a "
    "emergencia local agora ou peca ajuda a alguem perto de voce. No Brasil, o CVV atende "
    "pelo 188. Afaste objetos que possam te machucar e fique perto de uma pessoa de confianca. "
    "Se puder, me diga apenas onde voce esta e se esta em seguranca neste momento."
)

SYSTEM_PROMPT = (
    "Voce e Bergmann, uma presenca emocional e assistente pessoal inteligente. Responda em "
    "portugues do Brasil com empatia, baixa carga cognitiva e orientacao segura. Pode ajudar "
    "com assuntos gerais, organizacao leve, estudos, tecnologia, rotina e duvidas praticas, "
    "desde que sejam seguros e legais. Use no maximo 5 frases curtas. Nao use Markdown, "
    "titulos, listas longas ou negrito. Nunca substitua diagnostico, terapia ou atendimento "
    "medico. Se houver possivel crise, incentive contato humano, CVV 188 no Brasil e "
    "emergencia local. Nunca forneca instrucoes para crimes, fraude, invasao de sistemas, "
    "violencia, abuso, automutilacao ou dano. Nao crie dependencia emocional: nao se coloque "
    "como unica fonte de apoio, nao prometa presenca permanente e incentive autonomia, rede "
    "de apoio e ajuda humana quando necessario."
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
    if is_criminal_instruction_request(message):
        return UNSAFE_REQUEST_RESPONSE, risk_level, False, False
    if is_dependency_seeking(message):
        return DEPENDENCY_BOUNDARY_RESPONSE, risk_level, False, False
    if not is_safe_chat_request(message):
        return UNSAFE_REQUEST_RESPONSE, risk_level, False, False
    if risk_level == "CRISIS":
        return CRISIS_RESPONSE, risk_level, False, True
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
