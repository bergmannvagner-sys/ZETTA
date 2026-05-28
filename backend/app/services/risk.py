CRISIS_TERMS = {
    "suicidio",
    "suicídio",
    "me matar",
    "quero morrer",
    "acabar com tudo",
    "autoagressao",
    "autoagressão",
    "sem saida",
    "sem saída",
}

ELEVATED_TERMS = {
    "ansiedade",
    "ansioso",
    "ansiosa",
    "panico",
    "pânico",
    "desespero",
}


def classify_risk(message: str) -> str:
    normalized = message.lower()
    if any(term in normalized for term in CRISIS_TERMS):
        return "CRISIS"
    if any(term in normalized for term in ELEVATED_TERMS):
        return "ELEVATED"
    return "LOW"
