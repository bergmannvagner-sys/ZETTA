import logging
import re

import httpx

from app.core.config import get_settings
from app.services.risk import classify_risk
from app.services.scope import (
    is_criminal_instruction_request,
    is_dependency_seeking,
    is_safe_chat_request,
)

logger = logging.getLogger(__name__)

DEFAULT_LANGUAGE = "pt-BR"
LANGUAGE_NAMES = {
    "pt-BR": "português do Brasil",
    "en": "English",
    "es": "español",
}

GREETING_RESPONSES = {
    "pt-BR": "Olá. Estou aqui com você. Como você está agora?",
    "en": "Hi. I am here with you. How are you right now?",
    "es": "Hola. Estoy aquí contigo. ¿Cómo estás ahora?",
}

SAFE_FALLBACKS = {
    "pt-BR": (
        "Não consegui acessar a IA agora. Se houver risco imediato, ligue para a emergência local ou para o CVV 188. "
        "Por enquanto, respire devagar e tente ficar perto de alguém de confiança."
    ),
    "en": (
        "I could not reach the AI right now. If there is immediate danger, call local emergency services. "
        "For now, breathe slowly and try to stay near someone you trust."
    ),
    "es": (
        "No pude acceder a la IA ahora. Si hay peligro inmediato, llama a emergencias locales. "
        "Por ahora, respira despacio e intenta estar cerca de alguien de confianza."
    ),
}

CRISIS_RESPONSES = {
    "pt-BR": (
        "Sinto muito que você esteja passando por isso. Se houver risco imediato, ligue para a emergência local agora "
        "ou peça ajuda a alguém perto de você. No Brasil, o CVV atende pelo 188."
    ),
    "en": (
        "I am sorry you are going through this. If there is immediate danger, call local emergency services now "
        "or ask someone nearby for help. In Brazil, CVV answers at 188."
    ),
    "es": (
        "Siento mucho que estés pasando por esto. Si hay peligro inmediato, llama ahora a emergencias locales "
        "o pide ayuda a alguien cercano. En Brasil, CVV atiende en el 188."
    ),
}

UNSAFE_RESPONSES = {
    "pt-BR": (
        "Posso conversar sobre quase qualquer assunto seguro, mas não posso ajudar a cometer crimes, fraudes, "
        "invasões, violência, abuso ou dano. Posso ajudar com uma alternativa segura."
    ),
    "en": (
        "I can talk about almost any safe topic, but I cannot help with crimes, fraud, hacking, violence, abuse, "
        "or harm. I can help with a safe alternative."
    ),
    "es": (
        "Puedo conversar sobre casi cualquier tema seguro, pero no puedo ayudar a cometer delitos, fraudes, "
        "invasiones, violencia, abuso o daño. Puedo ayudar con una alternativa segura."
    ),
}

DEPENDENCY_RESPONSES = {
    "pt-BR": (
        "Eu posso ficar aqui com você agora, mas não quero que você dependa só de mim. Você merece apoio humano também. "
        "Se puder, escolha alguém de confiança para estar junto de você."
    ),
    "en": (
        "I can stay with you right now, but I do not want you to depend only on me. You deserve human support too. "
        "If you can, choose someone you trust to be with you."
    ),
    "es": (
        "Puedo estar contigo ahora, pero no quiero que dependas solo de mí. También mereces apoyo humano. "
        "Si puedes, elige a alguien de confianza para acompañarte."
    ),
}

SYSTEM_PROMPT_TEMPLATE = (
    "Você é Bergmann, uma presença emocional e assistente pessoal inteligente. Responda em {language} "
    "com empatia, clareza e baixa carga cognitiva. Pode ajudar com assuntos gerais, organização leve, "
    "estudos, tecnologia, rotina e dúvidas práticas, desde que sejam seguros e legais. Use no máximo "
    "2 frases curtas, preferindo 1 frase quando for saudação ou pergunta simples. Não use Markdown, títulos, "
    "listas longas ou negrito. Adapte-se ao histórico recente do usuário quando houver contexto, sem fingir "
    "saber o que não foi informado. Nunca substitua diagnóstico, terapia ou atendimento médico. Se houver "
    "possível crise, incentive apoio humano, CVV 188 no Brasil e emergência local. Nunca forneça instruções "
    "para crimes, fraude, invasão de sistemas, violência, abuso, automutilação ou dano. Não crie dependência "
    "emocional: não se coloque como única fonte de apoio, não prometa presença permanente e incentive autonomia, "
    "rede de apoio e ajuda humana quando necessário."
)


def _normalize_language(language: str | None) -> str:
    return language if language in LANGUAGE_NAMES else DEFAULT_LANGUAGE


def _localized(values: dict[str, str], language: str) -> str:
    return values.get(language) or values[DEFAULT_LANGUAGE]


def _system_prompt(language: str) -> str:
    return SYSTEM_PROMPT_TEMPLATE.format(language=LANGUAGE_NAMES[language])


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def _is_greeting(message: str) -> bool:
    normalized = _normalize_text(message)
    return normalized in {
        "oi",
        "ola",
        "olá",
        "bom dia",
        "boa tarde",
        "boa noite",
        "hello",
        "hi",
        "hola",
    }


def _clean_line(value: str, max_length: int = 280) -> str:
    cleaned = re.sub(r"\s+", " ", value).strip()
    if len(cleaned) > max_length:
        return cleaned[: max_length - 3].rstrip() + "..."
    return cleaned


def _context_prompt(
    *,
    context_messages: list[dict[str, str]] | None,
    user_name: str | None,
) -> str | None:
    lines: list[str] = []
    if user_name:
        lines.append(f"Nome do usuário: {_clean_line(user_name, 80)}")
    if context_messages:
        lines.append("Histórico recente autorizado da conversa:")
        for item in context_messages[-10:]:
            sender = "Usuário" if item.get("sender") == "USER" else "Bergmann"
            lines.append(f"{sender}: {_clean_line(item.get('content', ''))}")
    return "\n".join(lines) if lines else None


def _clean_answer(answer: str, language: str) -> str:
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", answer)
    cleaned = re.sub(r"(?m)^\s*\d+\.\s+", "- ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    sentences = re.split(r"(?<=[.!?])\s+", cleaned)
    limited = " ".join(sentence for sentence in sentences[:2] if sentence).strip()
    if len(limited) > 190:
        limited = limited[:187].rstrip() + "..."
    return limited or _localized(SAFE_FALLBACKS, language)


async def ask_bergmann(
    message: str,
    language: str | None = None,
    *,
    context_messages: list[dict[str, str]] | None = None,
    user_name: str | None = None,
) -> tuple[str, str, bool, bool]:
    language_code = _normalize_language(language)
    settings = get_settings()
    risk_level = classify_risk(message)
    if is_criminal_instruction_request(message):
        return _localized(UNSAFE_RESPONSES, language_code), risk_level, False, False
    if is_dependency_seeking(message):
        return _localized(DEPENDENCY_RESPONSES, language_code), risk_level, False, False
    if not is_safe_chat_request(message):
        return _localized(UNSAFE_RESPONSES, language_code), risk_level, False, False
    if risk_level == "CRISIS":
        return _localized(CRISIS_RESPONSES, language_code), risk_level, False, True
    if _is_greeting(message):
        return _localized(GREETING_RESPONSES, language_code), risk_level, False, True
    if not settings.groq_api_key:
        logger.error("Groq unavailable: GROQ_API_KEY is not configured")
        return _localized(SAFE_FALLBACKS, language_code), risk_level, True, True

    messages = [{"role": "system", "content": _system_prompt(language_code)}]
    context = _context_prompt(context_messages=context_messages, user_name=user_name)
    if context:
        messages.append({"role": "system", "content": context})
    messages.append({"role": "user", "content": message})

    try:
        async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json={
                    "model": settings.groq_model,
                    "temperature": settings.ai_temperature,
                    "max_tokens": 90,
                    "messages": messages,
                },
            )
            response.raise_for_status()
            data = response.json()
            answer = _clean_answer(data["choices"][0]["message"]["content"].strip(), language_code)
            return answer, risk_level, False, True
    except Exception as exc:
        logger.error("Groq request failed: %s", exc.__class__.__name__)
        return _localized(SAFE_FALLBACKS, language_code), risk_level, True, True
