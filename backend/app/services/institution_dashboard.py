import json
from collections import Counter
from datetime import UTC, datetime
from statistics import mean

from sqlalchemy.orm import Session

from app.models.emotional import EmotionLog, JournalEntry, SharingCategory, UserSharingConsent
from app.models.user import User
from app.schemas.institution import (
    InstitutionCategoryCount,
    InstitutionDashboardResponse,
    InstitutionMoodCount,
    InstitutionSharedUserSummary,
)

CONSENT_LOG_LIMIT = 14
MOOD_BREAKDOWN_LIMIT = 5


def _json_list(value: str | None) -> list[str]:
    if not value:
        return []
    data = json.loads(value)
    return data if isinstance(data, list) else []


def _categories(consent: UserSharingConsent) -> list[SharingCategory]:
    return [SharingCategory(category) for category in _json_list(consent.categories_json)]


def _safe_average(values: list[int | float | None]) -> float | None:
    clean_values = [value for value in values if value is not None]
    return round(mean(clean_values), 2) if clean_values else None


def _consent_logs(db: Session, consent: UserSharingConsent) -> list[EmotionLog]:
    query = db.query(EmotionLog).filter(EmotionLog.user_id == consent.owner_user_id)
    if consent.period_start:
        query = query.filter(EmotionLog.created_at >= consent.period_start)
    if consent.period_end:
        query = query.filter(EmotionLog.created_at <= consent.period_end)
    return query.order_by(EmotionLog.created_at.desc()).limit(CONSENT_LOG_LIMIT).all()


def _consent_journal_count(db: Session, consent: UserSharingConsent) -> int:
    query = db.query(JournalEntry).filter(JournalEntry.user_id == consent.owner_user_id)
    if consent.period_start:
        query = query.filter(JournalEntry.created_at >= consent.period_start)
    if consent.period_end:
        query = query.filter(JournalEntry.created_at <= consent.period_end)
    return query.count()


def build_institution_dashboard(db: Session, institution_user: User) -> InstitutionDashboardResponse:
    consents = (
        db.query(UserSharingConsent)
        .filter(
            UserSharingConsent.target_user_id == institution_user.id,
            UserSharingConsent.revoked_at.is_(None),
        )
        .order_by(UserSharingConsent.granted_at.desc())
        .all()
    )

    category_totals: Counter[str] = Counter()
    mood_totals: Counter[str] = Counter()
    shared_users: list[InstitutionSharedUserSummary] = []
    intensity_values: list[int] = []
    anxiety_values: list[int] = []
    stress_values: list[int] = []
    risk_flags = 0

    for consent in consents:
        categories = _categories(consent)
        category_set = set(categories)
        for category in categories:
            category_totals[category.value] += 1

        logs = _consent_logs(db, consent)
        allows_mood = SharingCategory.MOOD in category_set
        allows_trends = SharingCategory.TRENDS in category_set or SharingCategory.CRISIS in category_set

        latest_mood = logs[0].mood if logs and allows_mood else None
        average_intensity = _safe_average([log.intensity for log in logs]) if logs and allows_trends else None
        journal_entries_visible = (
            _consent_journal_count(db, consent)
            if SharingCategory.JOURNAL in category_set and not consent.summary_only
            else 0
        )

        if latest_mood:
            mood_totals[latest_mood] += 1

        if allows_trends and logs:
            intensity_values.extend(log.intensity for log in logs)
            anxiety_values.extend(value for value in (log.anxiety for log in logs) if value is not None)
            stress_values.extend(value for value in (log.stress for log in logs) if value is not None)
            if any((log.intensity >= 7) or ((log.anxiety or 0) >= 8) or ((log.stress or 0) >= 8) for log in logs):
                risk_flags += 1

        shared_users.append(
            InstitutionSharedUserSummary(
                user_id=consent.owner.id,
                full_name=consent.owner.full_name,
                email=consent.owner.email,
                categories=categories,
                summary_only=consent.summary_only,
                latest_mood=latest_mood,
                average_intensity=average_intensity,
                journal_entries_visible=journal_entries_visible,
                shared_at=consent.granted_at,
            )
        )

    participant_count = len(shared_users)
    category_breakdown = [
        InstitutionCategoryCount(category=category, count=category_totals[category.value])
        for category in SharingCategory
        if category.value in category_totals
    ]
    mood_breakdown = [InstitutionMoodCount(mood=mood, count=count) for mood, count in mood_totals.most_common(MOOD_BREAKDOWN_LIMIT)]
    average_intensity = _safe_average(intensity_values)
    average_anxiety = _safe_average(anxiety_values)
    average_stress = _safe_average(stress_values)

    if participant_count == 0:
        summary = "Nenhum compartilhamento ativo foi encontrado para este perfil institucional."
    elif average_intensity is None:
        summary = (
            f"{participant_count} pessoas autorizaram compartilhamento para este perfil institucional. "
            "Os dados disponíveis ainda não são suficientes para calcular intensidade média."
        )
    else:
        summary = (
            f"{participant_count} pessoas autorizaram compartilhamento para este perfil institucional. "
            f"A intensidade média dos registros disponíveis ficou em {average_intensity}."
        )

    return InstitutionDashboardResponse(
        institution_role=institution_user.role,
        participant_count=participant_count,
        category_breakdown=category_breakdown,
        mood_breakdown=mood_breakdown,
        average_intensity=average_intensity,
        average_anxiety=average_anxiety,
        average_stress=average_stress,
        risk_flags=risk_flags,
        summary=summary,
        privacy_note="Somente categorias autorizadas e resumos consentidos são exibidos.",
        shared_users=shared_users,
        generated_at=datetime.now(UTC),
    )
