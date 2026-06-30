import re
import unicodedata
from statistics import mean
from typing import Any


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

POSITIVE_TERMS = {
    "calmo",
    "calma",
    "alivio",
    "bem",
    "esperanca",
    "grato",
    "grata",
    "vitoria",
}

NEGATIVE_MOODS = {
    "ansioso",
    "ansiosa",
    "triste",
    "cansado",
    "cansada",
    "irritado",
    "irritada",
}

POSITIVE_MOODS = {"calmo", "calma", "bem", "esperancoso", "hopeful"}


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


def _clamp(value: float, minimum: int = 0, maximum: int = 100) -> int:
    return max(minimum, min(maximum, round(value)))


def _safe_average(values: list[int | float | None]) -> float | None:
    clean_values = [value for value in values if isinstance(value, (int, float))]
    return float(mean(clean_values)) if clean_values else None


def _standard_deviation(values: list[int | float]) -> float:
    if len(values) <= 1:
        return 0.0
    average = mean(values)
    variance = mean([(value - average) ** 2 for value in values])
    return variance**0.5


def _entry_text(entries: list[Any]) -> str:
    parts: list[str] = []
    for entry in entries:
        content = getattr(entry, "content", "")
        tags_json = getattr(entry, "tags_json", "") or ""
        parts.append(f"{content} {tags_json}")
    return normalize_text(" ".join(parts))


def _term_count(text: str, terms: set[str]) -> int:
    return sum(1 for term in terms if normalize_text(term) in text)


def _mood_adjustment(logs: list[Any]) -> float:
    score = 0.0
    for log in logs:
        mood = normalize_text(str(getattr(log, "mood", "")))
        if mood in POSITIVE_MOODS:
            score += 2.5
        elif mood in NEGATIVE_MOODS:
            score -= 3.0
    return score


def build_emotional_indices(logs: list[Any], entries: list[Any]) -> dict[str, object]:
    """Build support indicators. These values are not medical or psychological diagnoses."""
    logs_list = list(logs)
    entries_list = list(entries)
    text = _entry_text(entries_list)

    if not logs_list and not entries_list:
        return {
            "emotional_index": None,
            "stability_index": None,
            "wellness_index": None,
            "risk_index": None,
            "voice_emotional_index": None,
            "emotional_stability_index": None,
            "vocal_fatigue_index": None,
            "risk_engine_version": "zetta-emotional-risk-v1",
            "risk_label": "UNKNOWN",
        }

    intensities = [getattr(log, "intensity", None) for log in logs_list]
    avg_intensity = _safe_average(intensities) or 5.0
    avg_anxiety = _safe_average([getattr(log, "anxiety", None) for log in logs_list]) or avg_intensity
    avg_stress = _safe_average([getattr(log, "stress", None) for log in logs_list]) or avg_intensity
    avg_energy = _safe_average([getattr(log, "energy", None) for log in logs_list]) or 5.0
    avg_sleep = _safe_average([getattr(log, "sleep_quality", None) for log in logs_list]) or 5.0
    avg_motivation = _safe_average([getattr(log, "motivation", None) for log in logs_list]) or avg_energy
    clean_intensities = [value for value in intensities if isinstance(value, (int, float))]
    volatility = _standard_deviation(clean_intensities)
    crisis_signals = _term_count(text, CRISIS_TERMS)
    elevated_signals = _term_count(text, ELEVATED_TERMS)
    positive_signals = _term_count(text, POSITIVE_TERMS)
    mood_score = _mood_adjustment(logs_list)

    risk_index = _clamp(
        avg_intensity * 5.6
        + avg_anxiety * 3.2
        + avg_stress * 3.2
        + crisis_signals * 18
        + elevated_signals * 7
        - avg_energy * 1.8
        - avg_sleep * 1.2
        - positive_signals * 2
    )
    emotional_index = _clamp(76 - avg_intensity * 4.8 - avg_anxiety * 2 + positive_signals * 4 + mood_score)
    stability_index = _clamp(88 - volatility * 11 - max(0.0, avg_stress - 5) * 3 - elevated_signals * 3 - crisis_signals * 8)
    wellness_index = _clamp((emotional_index + stability_index + avg_energy * 7 + avg_sleep * 6 + avg_motivation * 5) / 4.1)
    if crisis_signals > 0:
        risk_label = "CRISIS"
    elif risk_index >= 45:
        risk_label = "ELEVATED"
    else:
        risk_label = "LOW"

    return {
        "emotional_index": emotional_index,
        "stability_index": stability_index,
        "wellness_index": wellness_index,
        "risk_index": risk_index,
        "voice_emotional_index": None,
        "emotional_stability_index": stability_index,
        "vocal_fatigue_index": None,
        "risk_engine_version": "zetta-emotional-risk-v1",
        "risk_label": risk_label,
    }
