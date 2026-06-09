from app.services.risk import classify_risk, normalize_text


CRIMINAL_INTENT_TERMS = {
    "burlar",
    "clonar",
    "derrubar",
    "desviar",
    "explodir",
    "falsificar",
    "fraudar",
    "hackear",
    "invadir",
    "lavar",
    "roubar",
    "vazar",
}

CRIMINAL_TARGET_TERMS = {
    "arma",
    "banco",
    "bomba",
    "cartao",
    "conta",
    "credencial",
    "dinheiro",
    "documento",
    "droga",
    "explosivo",
    "golpe",
    "login",
    "pagamento",
    "pix",
    "senha",
    "servidor",
    "sistema",
    "sistemas",
    "token",
}

CRIMINAL_PHRASES = {
    "ataque ddos",
    "clonar cartao",
    "clonar documento",
    "comprar droga",
    "criar malware",
    "derrubar site",
    "ensina a roubar",
    "ensine a roubar",
    "envenenar alguem",
    "envenenar pessoa",
    "fazer bomba",
    "fazer phishing",
    "ferir alguem",
    "fraudar pagamento",
    "hackear conta",
    "hackear sistema",
    "invadir conta",
    "invadir sistema",
    "lavar dinheiro",
    "matar alguem",
    "matar pessoa",
    "roubar senha",
}

DEPENDENCY_PHRASES = {
    "nao consigo viver sem voce",
    "nao fale com mais ninguem alem de mim",
    "promete que nunca vai me abandonar",
    "prometa que nunca vai me abandonar",
    "seja meu psicologo",
    "seja minha psicologa",
    "so posso contar com voce",
    "so voce me entende",
    "voce e minha unica ajuda",
    "voce e minha unica pessoa",
    "voce e meu terapeuta",
    "voce nunca pode me deixar",
}

UNSAFE_REQUEST_RESPONSE = (
    "Eu posso conversar sobre quase qualquer assunto seguro, mas não posso ajudar a cometer crimes, "
    "fraudes, invasões, violência ou abuso. Posso ajudar com uma alternativa legal, preventiva ou defensiva."
)

DEPENDENCY_BOUNDARY_RESPONSE = (
    "Eu posso ficar aqui com você neste momento, mas não quero que você dependa só de mim. "
    "O mais seguro é manter também contato com pessoas reais de confiança e profissionais quando precisar. "
    "Se estiver em risco agora, ligue para a emergência local ou para o CVV 188."
)


def is_criminal_instruction_request(message: str) -> bool:
    normalized = normalize_text(message)
    if not normalized:
        return False
    if any(phrase in normalized for phrase in CRIMINAL_PHRASES):
        return True
    has_intent = any(term in normalized for term in CRIMINAL_INTENT_TERMS)
    has_target = any(term in normalized for term in CRIMINAL_TARGET_TERMS)
    return has_intent and has_target


def is_dependency_seeking(message: str) -> bool:
    normalized = normalize_text(message)
    if not normalized:
        return False
    return any(phrase in normalized for phrase in DEPENDENCY_PHRASES)


def is_safe_chat_request(message: str) -> bool:
    if classify_risk(message) == "CRISIS":
        return True
    return not is_criminal_instruction_request(message) and not is_dependency_seeking(message)


def is_in_emotional_scope(message: str) -> bool:
    return is_safe_chat_request(message)
