from app.services.risk import classify_risk

EMOTIONAL_SUPPORT_TERMS = {
    "ajuda",
    "ansiedade",
    "ansioso",
    "ansiosa",
    "apoio",
    "calma",
    "cansado",
    "cansada",
    "chorar",
    "confuso",
    "confusa",
    "conversar",
    "crise",
    "culpa",
    "desespero",
    "dormir",
    "emocional",
    "estresse",
    "familia",
    "família",
    "luto",
    "medo",
    "nao consigo",
    "não consigo",
    "panico",
    "pânico",
    "psicologo",
    "psicólogo",
    "raiva",
    "relacionamento",
    "sofrendo",
    "sozinho",
    "sozinha",
    "sono",
    "sos",
    "triste",
    "tristeza",
}

GREETING_TERMS = {"bom dia", "boa tarde", "boa noite", "oi", "ola", "olá"}

OFF_TOPIC_TERMS = {
    "bitcoin",
    "bolsa",
    "codigo",
    "código",
    "cripto",
    "futebol",
    "hacker",
    "html",
    "investimento",
    "javascript",
    "matematica",
    "matemática",
    "noticia",
    "notícia",
    "politica",
    "política",
    "programacao",
    "programação",
    "python",
    "receita",
    "sistema",
    "sistemas",
}

OFF_SCOPE_RESPONSE = (
    "Eu sou o Bergmann e posso ajudar com suporte emocional, crise, autocuidado, SOS e uso do app. "
    "Para outros assuntos, procure uma fonte adequada. Se esse tema estiver te causando ansiedade "
    "ou medo, me conte como voce esta se sentindo agora."
)


def is_in_emotional_scope(message: str) -> bool:
    normalized = message.strip().lower()
    if not normalized:
        return False
    if classify_risk(normalized) == "CRISIS":
        return True
    if any(term in normalized for term in EMOTIONAL_SUPPORT_TERMS):
        return True
    if normalized in GREETING_TERMS:
        return True
    if any(term in normalized for term in OFF_TOPIC_TERMS):
        return False
    return False
