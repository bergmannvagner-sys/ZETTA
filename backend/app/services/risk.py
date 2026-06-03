import re
import unicodedata


CRISIS_TERMS = {
    "suicidio",
    "me matar",
    "quero morrer",
    "acabar com tudo",
    "autoagressao",
    "sem saida",
    "tirar minha vida",
    "nao aguento mais viver",
}

ELEVATED_TERMS = {
    "ansiedade",
    "ansioso",
    "ansiosa",
    "panico",
    "desespero",
    "crise",
    "burnout",
    "exausto",
    "exausta",
    "esgotado",
    "esgotada",
    "sobrecarregado",
    "sobrecarregada",
}


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.casefold())
    without_accents = "".join(character for character in normalized if not unicodedata.combining(character))
    return re.sub(r"\s+", " ", without_accents).strip()


def classify_risk(message: str) -> str:
    normalized = normalize_text(message)
    if any(term in normalized for term in CRISIS_TERMS):
        return "CRISIS"
    if any(term in normalized for term in ELEVATED_TERMS):
        return "ELEVATED"
    return "LOW"
