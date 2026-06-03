from app.services.risk import classify_risk, normalize_text


EMOTIONAL_SUPPORT_TERMS = {
    "acolhimento",
    "ajuda",
    "ansiedade",
    "ansioso",
    "ansiosa",
    "apoio",
    "autocuidado",
    "baixa energia",
    "burnout",
    "calma",
    "cansado",
    "cansada",
    "chorar",
    "confuso",
    "confusa",
    "conversar",
    "crise",
    "culpa",
    "desanimado",
    "desanimada",
    "desespero",
    "dormir",
    "emocao",
    "emocional",
    "estresse",
    "exausto",
    "exausta",
    "familia",
    "gatilho",
    "humor",
    "luto",
    "mal",
    "medo",
    "me sinto",
    "motivacao",
    "nao consigo",
    "nervoso",
    "nervosa",
    "panico",
    "pausa",
    "preciso falar",
    "psicologo",
    "psicologa",
    "raiva",
    "relacionamento",
    "respirar",
    "rotina",
    "sentindo",
    "sofrendo",
    "sono",
    "sos",
    "sozinho",
    "sozinha",
    "sobrecarregado",
    "sobrecarregada",
    "triste",
    "tristeza",
}

GREETING_TERMS = {"bom dia", "boa tarde", "boa noite", "ei", "ola", "oi"}

OFF_TOPIC_TERMS = {
    "aposta",
    "bitcoin",
    "bolsa",
    "codigo",
    "cripto",
    "futebol",
    "hackear",
    "hacker",
    "html",
    "investimento",
    "javascript",
    "matematica",
    "noticia",
    "politica",
    "programacao",
    "python",
    "receita",
    "script",
    "sistema",
    "sistemas",
    "sql",
}

OFF_SCOPE_RESPONSE = (
    "Eu sou o Bergmann e posso ajudar com suporte emocional, crise, autocuidado, SOS e uso do app. "
    "Para outros assuntos, procure uma fonte adequada. Se esse tema estiver te causando ansiedade "
    "ou medo, me conte como voce esta se sentindo agora."
)


def is_in_emotional_scope(message: str) -> bool:
    normalized = normalize_text(message)
    if not normalized:
        return False
    if classify_risk(normalized) == "CRISIS":
        return True

    has_emotional_context = any(term in normalized for term in EMOTIONAL_SUPPORT_TERMS)
    has_off_topic_context = any(term in normalized for term in OFF_TOPIC_TERMS)
    if has_emotional_context:
        return True
    if has_off_topic_context:
        return False
    if normalized in GREETING_TERMS:
        return True
    if any(normalized.startswith(f"{term} ") for term in GREETING_TERMS) and len(normalized) <= 80:
        return True
    return False
