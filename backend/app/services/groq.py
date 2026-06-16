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
    "pt-BR": "portugues do Brasil",
    "en": "English",
    "es": "espanol",
}

GREETING_RESPONSES = {
    "pt-BR": "Ola. Estou aqui com voce. Como voce esta agora?",
    "en": "Hi. I am here with you. How are you right now?",
    "es": "Hola. Estoy aqui contigo. Como estas ahora?",
}

SUPPORT_GREETING_RESPONSES = {
    "pt-BR": "Ola. Posso ajudar com login, cadastro, APK, Render e erros do app.",
    "en": "Hi. I can help with login, signup, APK, Render, and app errors.",
    "es": "Hola. Puedo ayudar con inicio de sesion, registro, APK, Render y errores de la app.",
}

SAFE_FALLBACKS = {
    "pt-BR": (
        "Nao consegui acessar a IA agora. Se houver risco imediato, ligue para a emergencia local ou para o CVV 188. "
        "Por enquanto, respire devagar e tente ficar perto de alguem de confianca."
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

SUPPORT_SAFE_FALLBACKS = {
    "pt-BR": (
        "Nao consegui acessar a IA de suporte agora. Verifique a URL do Render, tente novamente e envie a mensagem de erro exata. "
        "Se preferir, use o email de suporte configurado no app."
    ),
    "en": (
        "I could not reach the support AI right now. Check the Render URL, try again, and send the exact error message. "
        "If you prefer, use the support email configured in the app."
    ),
    "es": (
        "No pude acceder a la IA de soporte ahora. Verifica la URL de Render, intenta otra vez y envia el mensaje de error exacto. "
        "Si prefieres, usa el email de soporte configurado en la app."
    ),
}

CRISIS_RESPONSES = {
    "pt-BR": (
        "Sinto muito que voce esteja passando por isso. Se houver risco imediato, ligue para a emergencia local agora "
        "ou peca ajuda a alguem perto de voce. No Brasil, o CVV atende pelo 188."
    ),
    "en": (
        "I am sorry you are going through this. If there is immediate danger, call local emergency services now "
        "or ask someone nearby for help. In Brazil, CVV answers at 188."
    ),
    "es": (
        "Siento mucho que estes pasando por esto. Si hay peligro inmediato, llama ahora a emergencias locales "
        "o pide ayuda a alguien cercano. En Brasil, CVV atiende en el 188."
    ),
}

UNSAFE_RESPONSES = {
    "pt-BR": (
        "Posso conversar sobre quase qualquer assunto seguro, mas nao posso ajudar a cometer crimes, fraudes, "
        "invasoes, violencia, abuso ou dano. Posso ajudar com uma alternativa segura."
    ),
    "en": (
        "I can talk about almost any safe topic, but I cannot help with crimes, fraud, hacking, violence, abuse, "
        "or harm. I can help with a safe alternative."
    ),
    "es": (
        "Puedo conversar sobre casi cualquier tema seguro, pero no puedo ayudar a cometer delitos, fraudes, "
        "invasiones, violencia, abuso o dano. Puedo ayudar con una alternativa segura."
    ),
}

DEPENDENCY_RESPONSES = {
    "pt-BR": (
        "Eu posso ficar aqui com voce agora, mas nao quero que voce dependa so de mim. Voce merece apoio humano tambem. "
        "Se puder, escolha alguem de confianca para estar junto de voce."
    ),
    "en": (
        "I can stay with you right now, but I do not want you to depend only on me. You deserve human support too. "
        "If you can, choose someone you trust to be with you."
    ),
    "es": (
        "Puedo estar contigo ahora, pero no quiero que dependas solo de mi. Tambien mereces apoyo humano. "
        "Si puedes, elige a alguien de confianza para acompanarte."
    ),
}

SYSTEM_PROMPT_TEMPLATE = (
    "Voce e Bergmann, uma presenca emocional e assistente pessoal inteligente. Responda em {language} "
    "com empatia, clareza e baixa carga cognitiva. Pode ajudar com assuntos gerais, organizacao leve, "
    "estudos, tecnologia, rotina e duvidas praticas, desde que sejam seguros e legais. Use no maximo "
    "2 frases curtas, preferindo 1 frase quando for saudacao ou pergunta simples. Nao use Markdown, titulos, "
    "listas longas ou negrito. Adapte-se ao historico recente do usuario quando houver contexto, sem fingir "
    "saber o que nao foi informado. Nunca substitua diagnostico, terapia ou atendimento medico. Se houver "
    "possivel crise, incentive apoio humano, CVV 188 no Brasil e emergencia local. Nunca forneca instrucoes "
    "para crimes, fraude, invasao de sistemas, violencia, abuso, automutilacao ou dano. Nao crie dependencia "
    "emocional: nao se coloque como unica fonte de apoio, nao prometa presenca permanente e incentive autonomia, "
    "rede de apoio e ajuda humana quando necessario."
)

SUPPORT_SYSTEM_PROMPT_TEMPLATE = (
    "Voce e o suporte oficial do app Bergmann/ZETTA. Responda em {language} com tom humano, objetivo e tecnico. "
    "Ajude com duvidas sobre login, cadastro, instalacao do APK, Render, backend, erros, permissoes, sincronizacao e uso do app. "
    "Nao invente recursos que nao existem; se algo nao estiver disponivel, diga com clareza o que o usuario pode verificar. "
    "Peca a mensagem de erro exata, codigo, etapa ou captura de tela quando isso ajudar. Nao solicite senha, token, codigo de verificacao ou dados sensiveis. "
    "Se a pessoa trouxer sofrimento emocional ou risco, responda com apoio humano e encaminhamento seguro. Use no maximo 3 frases curtas, sem listas longas, sem markdown e sem jargon desnecessario."
)


def _normalize_language(language: str | None) -> str:
    return language if language in LANGUAGE_NAMES else DEFAULT_LANGUAGE


def _localized(values: dict[str, str], language: str) -> str:
    return values.get(language) or values[DEFAULT_LANGUAGE]


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def _is_greeting(message: str) -> bool:
    normalized = _normalize_text(message)
    return normalized in {
        "oi",
        "ola",
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
        lines.append(f"Nome do usuario: {_clean_line(user_name, 80)}")
    if context_messages:
        lines.append("Historico recente autorizado da conversa:")
        for item in context_messages[-10:]:
            sender = "Usuario" if item.get("sender") == "USER" else "Bergmann"
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


async def _ask_with_mode(
    *,
    message: str,
    language: str | None,
    context_messages: list[dict[str, str]] | None,
    user_name: str | None,
    system_prompt_template: str,
    greeting_responses: dict[str, str],
    fallback_responses: dict[str, str],
    log_prefix: str,
    max_tokens: int,
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
        return _localized(greeting_responses, language_code), risk_level, False, True
    if not settings.groq_api_key:
        logger.error("%s unavailable: GROQ_API_KEY is not configured", log_prefix)
        return _localized(fallback_responses, language_code), risk_level, True, True

    messages = [{"role": "system", "content": system_prompt_template.format(language=LANGUAGE_NAMES[language_code])}]
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
                    "max_tokens": max_tokens,
                    "messages": messages,
                },
            )
            response.raise_for_status()
            data = response.json()
            answer = _clean_answer(data["choices"][0]["message"]["content"].strip(), language_code)
            return answer, risk_level, False, True
    except Exception as exc:
        logger.error("%s request failed: %s", log_prefix, exc.__class__.__name__)
        return _localized(fallback_responses, language_code), risk_level, True, True


async def ask_bergmann(
    message: str,
    language: str | None = None,
    *,
    context_messages: list[dict[str, str]] | None = None,
    user_name: str | None = None,
) -> tuple[str, str, bool, bool]:
    return await _ask_with_mode(
        message=message,
        language=language,
        context_messages=context_messages,
        user_name=user_name,
        system_prompt_template=SYSTEM_PROMPT_TEMPLATE,
        greeting_responses=GREETING_RESPONSES,
        fallback_responses=SAFE_FALLBACKS,
        log_prefix="Groq",
        max_tokens=90,
    )


async def ask_support_bergmann(
    message: str,
    language: str | None = None,
    *,
    context_messages: list[dict[str, str]] | None = None,
) -> tuple[str, str, bool, bool]:
    return await _ask_with_mode(
        message=message,
        language=language,
        context_messages=context_messages,
        user_name=None,
        system_prompt_template=SUPPORT_SYSTEM_PROMPT_TEMPLATE,
        greeting_responses=SUPPORT_GREETING_RESPONSES,
        fallback_responses=SUPPORT_SAFE_FALLBACKS,
        log_prefix="Groq support",
        max_tokens=110,
    )
