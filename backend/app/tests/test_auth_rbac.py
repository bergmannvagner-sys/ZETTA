import os
import json

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-with-more-than-thirty-two-chars")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:8081")
os.environ["APP_ENV"] = "test"

from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.privacy import AuditAction, AuditLog
from app.core.security import hash_password
from app.core.config import get_settings
from app.models.user import AccountStatus, SubscriptionStatus, User, UserRole
from app.services.billing_webhooks import build_signature
from app.services.payment_adapters import (
    PaymentProviderNotConfigured,
    get_payment_adapter,
    validate_billing_reference,
)

Base.metadata.create_all(bind=engine)
client = TestClient(app)


def test_public_registration_blocks_super_admin() -> None:
    response = client.post(
        "/auth/register",
        json={
            "email": "admin@example.com",
            "full_name": "Admin",
            "password": "strongpass123",
            "role": "SUPER_ADMIN",
            "document": "52998224725",
            "lgpdConsent": True,
        },
    )
    assert response.status_code == 400


def test_public_registration_requires_lgpd_consent() -> None:
    response = client.post(
        "/auth/register",
        json={
            "email": "no-consent@example.com",
            "full_name": "Pessoa Sem Consentimento",
            "password": "strongpass123",
            "role": "USER",
            "document": "52998224725",
            "lgpdConsent": False,
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "LGPD consent required"


def test_user_register_login_and_access_common_area() -> None:
    register = client.post(
        "/auth/register",
        json={
            "email": "user@example.com",
            "full_name": "Pessoa User",
            "password": "strongpass123",
            "role": "USER",
            "document": "52998224725",
            "lgpdConsent": True,
        },
    )
    assert register.status_code == 201
    data = register.json()
    assert data["user"]["status"] == "ACTIVE"
    assert data["user"]["document_type"] == "CPF"
    assert data["user"]["document_last4"] == "4725"
    assert data["user"]["subscription_plan"] == "FREE_USER"
    assert data["user"]["subscription_status"] == "FREE"

    me = client.get("/users/me", headers={"Authorization": f"Bearer {data['access_token']}"})
    assert me.status_code == 200
    assert me.json()["role"] == "USER"


def test_registration_accepts_deployed_client_field_aliases() -> None:
    response = client.post(
        "/auth/register",
        json={
            "email": "alias-user@example.com",
            "name": "Pessoa Alias",
            "password": "strongpass123",
            "accountType": "USER",
            "cpf": "11144477735",
            "lgpdConsent": True,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["full_name"] == "Pessoa Alias"
    assert data["user"]["role"] == "USER"
    assert data["user"]["status"] == "ACTIVE"


def test_registration_blocks_duplicate_document() -> None:
    first = client.post(
        "/auth/register",
        json={
            "email": "document-owner@example.com",
            "full_name": "Pessoa Documento",
            "password": "strongpass123",
            "role": "USER",
            "document": "93541134780",
            "lgpdConsent": True,
        },
    )
    assert first.status_code == 201

    duplicate = client.post(
        "/auth/register",
        json={
            "email": "document-copy@example.com",
            "full_name": "Pessoa Copia",
            "password": "strongpass123",
            "role": "USER",
            "document": "935.411.347-80",
            "lgpdConsent": True,
        },
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Document already registered"


def test_non_user_registration_is_pending_and_blocked_from_active_routes() -> None:
    register = client.post(
        "/auth/register",
        json={
            "email": "psi@example.com",
            "full_name": "Psicologa",
            "password": "strongpass123",
            "role": "PSYCHOLOGIST",
            "document": "06/123456",
            "lgpdConsent": True,
        },
    )
    assert register.status_code == 201
    data = register.json()
    assert data["user"]["status"] == "PENDING_VERIFICATION"
    assert data["user"]["subscription_plan"] == "PSYCHOLOGIST_PRO"
    assert data["user"]["subscription_status"] == "PENDING"

    sos = client.post(
        "/sos/event",
        json={"intensity": "HIGH"},
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert sos.status_code == 403


def test_approved_non_user_is_blocked_from_common_sos() -> None:
    register = client.post(
        "/auth/register",
        json={
            "email": "company@example.com",
            "full_name": "Empresa Teste",
            "password": "strongpass123",
            "role": "COMPANY",
            "document": "11222333000181",
            "lgpdConsent": True,
        },
    )
    assert register.status_code == 201
    data = register.json()
    db = SessionLocal()
    try:
        user = db.get(User, data["user"]["id"])
        assert user is not None
        user.status = AccountStatus.ACTIVE
        user.subscription_status = SubscriptionStatus.ACTIVE
        db.commit()
    finally:
        db.close()

    headers = {"Authorization": f"Bearer {data['access_token']}"}
    consent_status = client.get("/privacy/consent", headers=headers)
    accept_consent = client.post(
        "/privacy/consent",
        json={"policy_version": consent_status.json()["policy_version"]},
        headers=headers,
    )
    assert accept_consent.status_code == 200

    sos = client.post("/sos/event", json={"intensity": "HIGH"}, headers=headers)
    assert sos.status_code == 403
    assert sos.json()["detail"] == "Only common area allowed"


def test_paid_profile_requires_active_subscription_after_approval() -> None:
    register = client.post(
        "/auth/register",
        json={
            "email": "company-no-plan@example.com",
            "full_name": "Empresa Sem Plano",
            "password": "strongpass123",
            "role": "COMPANY",
            "document": "55443322000105",
            "lgpdConsent": True,
        },
    )
    assert register.status_code == 201
    data = register.json()
    db = SessionLocal()
    try:
        user = db.get(User, data["user"]["id"])
        assert user is not None
        user.status = AccountStatus.ACTIVE
        user.subscription_status = SubscriptionStatus.PENDING
        db.commit()
    finally:
        db.close()

    headers = {"Authorization": f"Bearer {data['access_token']}"}
    consent_status = client.get("/privacy/consent", headers=headers)
    client.post(
        "/privacy/consent",
        json={"policy_version": consent_status.json()["policy_version"]},
        headers=headers,
    )
    response = client.get("/nr1/report", headers=headers)
    assert response.status_code == 402
    assert response.json()["detail"] == "Paid plan required"


def test_super_admin_can_archive_rejected_or_qa_accounts_and_login_is_blocked() -> None:
    register = client.post(
        "/auth/register",
        json={
            "email": "qa-archive-user@example.com",
            "full_name": "Pessoa QA Arquivo",
            "password": "strongpass123",
            "role": "USER",
            "document": "98765432100",
            "lgpdConsent": True,
        },
    )
    assert register.status_code == 201
    target_id = register.json()["user"]["id"]

    db = SessionLocal()
    try:
        admin = User(
            email="archive-admin@example.com",
            full_name="Admin Archive",
            password_hash=hash_password("strongpass123"),
            role=UserRole.SUPER_ADMIN,
            status=AccountStatus.ACTIVE,
            subscription_plan="INTERNAL",
            subscription_status=SubscriptionStatus.ACTIVE,
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()

    admin_login = client.post(
        "/auth/login",
        json={"email": "archive-admin@example.com", "password": "strongpass123"},
    )
    assert admin_login.status_code == 200
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    archive = client.post(
        "/admin/archive-account",
        json={"user_id": target_id, "reason": "cleanup QA account"},
        headers=admin_headers,
    )
    assert archive.status_code == 200
    assert archive.json()["status"] == "archived"

    login = client.post(
        "/auth/login",
        json={"email": "qa-archive-user@example.com", "password": "strongpass123"},
    )
    assert login.status_code == 403
    assert login.json()["detail"] == "Account archived"

    audit = client.get("/admin/audit-logs?action=ACCOUNT_ARCHIVED&limit=10", headers=admin_headers)
    assert audit.status_code == 200
    archive_log = next(entry for entry in audit.json() if entry["target_user_id"] == target_id)
    assert archive_log["metadata"]["previous_status"] == "ACTIVE"
    assert archive_log["metadata"]["subscription_status"] == "CANCELED"

    moderated = client.get("/admin/moderated-accounts?account_status=ARCHIVED&q=qa-archive-user", headers=admin_headers)
    assert moderated.status_code == 200
    moderated_payload = moderated.json()
    assert len(moderated_payload) == 1
    assert moderated_payload[0]["id"] == target_id
    assert moderated_payload[0]["status"] == "ARCHIVED"

    invalid_status = client.get("/admin/moderated-accounts?account_status=ACTIVE", headers=admin_headers)
    assert invalid_status.status_code == 400

    user_audit = client.get(f"/admin/audit-logs?target_user_id={target_id}&limit=10", headers=admin_headers)
    assert user_audit.status_code == 200
    assert any(entry["action"] == "ACCOUNT_ARCHIVED" for entry in user_audit.json())


def test_e2e_user_consent_chat_sos_and_audit() -> None:
    register = client.post(
        "/auth/register",
        json={
            "email": "e2e-user@example.com",
            "full_name": "Pessoa E2E",
            "password": "strongpass123",
            "role": "USER",
            "document": "12345678909",
            "lgpdConsent": True,
        },
    )
    assert register.status_code == 201
    data = register.json()
    access_token = data["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    blocked_chat = client.post(
        "/chat/message",
        json={"message": "Estou ansioso hoje"},
        headers=headers,
    )
    assert blocked_chat.status_code == 403
    assert blocked_chat.json()["detail"] == "LGPD consent required"

    consent_status = client.get("/privacy/consent", headers=headers)
    assert consent_status.status_code == 200
    assert consent_status.json()["accepted"] is False

    accept_consent = client.post(
        "/privacy/consent",
        json={"policy_version": consent_status.json()["policy_version"]},
        headers=headers,
    )
    assert accept_consent.status_code == 200
    assert accept_consent.json()["accepted"] is True

    chat = client.post(
        "/chat/message",
        json={"message": "Estou ansioso hoje"},
        headers=headers,
    )
    assert chat.status_code == 200
    assert chat.json()["fallback"] is True
    assert chat.json()["in_scope"] is True
    assert chat.json()["risk_level"] == "ELEVATED"

    off_topic_chat = client.post(
        "/chat/message",
        json={"message": "Hacker sistemas"},
        headers=headers,
    )
    assert off_topic_chat.status_code == 200
    assert off_topic_chat.json()["in_scope"] is False
    assert "suporte emocional" in off_topic_chat.json()["answer"]

    crisis_chat = client.post(
        "/chat/message",
        json={"message": "quero morrer e estou sem saida"},
        headers=headers,
    )
    assert crisis_chat.status_code == 200
    assert crisis_chat.json()["risk_level"] == "CRISIS"
    assert "188" in crisis_chat.json()["answer"]

    sos = client.post(
        "/sos/event",
        json={"intensity": "HIGH", "message": "Preciso de ajuda"},
        headers=headers,
    )
    assert sos.status_code == 200
    assert "CVV" in sos.json()["safety_message"]

    db = SessionLocal()
    try:
        actions = {entry.action for entry in db.query(AuditLog).all()}
    finally:
        db.close()
    assert AuditAction.USER_REGISTERED in actions
    assert AuditAction.CONSENT_ACCEPTED in actions
    assert AuditAction.CHAT_MESSAGE_CREATED in actions
    assert AuditAction.SOS_EVENT_CREATED in actions


def test_password_reset_flow_changes_password_and_revokes_old_refresh_tokens() -> None:
    register = client.post(
        "/auth/register",
        json={
            "email": "reset-user@example.com",
            "full_name": "Pessoa Reset",
            "password": "strongpass123",
            "role": "USER",
            "document": "39053344705",
            "lgpdConsent": True,
        },
    )
    assert register.status_code == 201
    old_refresh = register.json()["refresh_token"]

    request = client.post("/auth/password-reset/request", json={"email": "reset-user@example.com"})
    assert request.status_code == 200
    reset_token = request.json()["reset_token"]
    assert reset_token

    confirm = client.post(
        "/auth/password-reset/confirm",
        json={"token": reset_token, "new_password": "newstrongpass123"},
    )
    assert confirm.status_code == 200

    old_login = client.post(
        "/auth/login",
        json={"email": "reset-user@example.com", "password": "strongpass123"},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/auth/login",
        json={"email": "reset-user@example.com", "password": "newstrongpass123"},
    )
    assert new_login.status_code == 200

    old_refresh_response = client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert old_refresh_response.status_code == 401


def test_emotional_journal_sharing_and_nr1_privacy_boundaries() -> None:
    user_register = client.post(
        "/auth/register",
        json={
            "email": "sharing-user@example.com",
            "full_name": "Pessoa Sharing",
            "password": "strongpass123",
            "role": "USER",
            "document": "24681357928",
            "lgpdConsent": True,
        },
    )
    assert user_register.status_code == 201
    user_token = user_register.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}
    consent_status = client.get("/privacy/consent", headers=user_headers)
    client.post(
        "/privacy/consent",
        json={"policy_version": consent_status.json()["policy_version"]},
        headers=user_headers,
    )

    psychologist_register = client.post(
        "/auth/register",
        json={
            "email": "sharing-psi@example.com",
            "full_name": "Psicologa Sharing",
            "password": "strongpass123",
            "role": "PSYCHOLOGIST",
            "document": "06/456789",
            "lgpdConsent": True,
        },
    )
    company_register = client.post(
        "/auth/register",
        json={
            "email": "sharing-company@example.com",
            "full_name": "Empresa Sharing",
            "password": "strongpass123",
            "role": "COMPANY",
            "document": "24681357000140",
            "lgpdConsent": True,
        },
    )
    assert psychologist_register.status_code == 201
    assert company_register.status_code == 201
    db = SessionLocal()
    try:
        for email in ("sharing-psi@example.com", "sharing-company@example.com"):
            target = db.query(User).filter(User.email == email).first()
            assert target is not None
            target.status = AccountStatus.ACTIVE
            target.subscription_status = SubscriptionStatus.ACTIVE
        db.commit()
    finally:
        db.close()

    psychologist_login = client.post(
        "/auth/login",
        json={"email": "sharing-psi@example.com", "password": "strongpass123"},
    )
    company_login = client.post(
        "/auth/login",
        json={"email": "sharing-company@example.com", "password": "strongpass123"},
    )
    psychologist_headers = {"Authorization": f"Bearer {psychologist_login.json()['access_token']}"}
    company_headers = {"Authorization": f"Bearer {company_login.json()['access_token']}"}

    for headers in (psychologist_headers, company_headers):
        target_consent_status = client.get("/privacy/consent", headers=headers)
        client.post(
            "/privacy/consent",
            json={"policy_version": target_consent_status.json()["policy_version"]},
            headers=headers,
        )

    psychologist_code = client.get("/connections/me", headers=psychologist_headers)
    assert psychologist_code.status_code == 200
    assert psychologist_code.json()["connection_code"].startswith("BG")

    search_by_code = client.get(
        "/connections/search",
        params={"query": psychologist_code.json()["connection_code"]},
        headers=user_headers,
    )
    assert search_by_code.status_code == 200
    assert search_by_code.json()["email"] == "sharing-psi@example.com"
    assert search_by_code.json()["role"] == "PSYCHOLOGIST"

    search_by_email = client.get(
        "/connections/search",
        params={"query": "sharing-company@example.com"},
        headers=user_headers,
    )
    assert search_by_email.status_code == 200
    assert search_by_email.json()["role"] == "COMPANY"

    company_cannot_search = client.get(
        "/connections/search",
        params={"query": "sharing-psi@example.com"},
        headers=company_headers,
    )
    assert company_cannot_search.status_code == 403

    journal = client.post(
        "/journal/entries",
        json={"content": "Hoje fiquei ansioso, mas consegui pedir ajuda.", "tags": ["ansiedade", "vitoria"]},
        headers=user_headers,
    )
    assert journal.status_code == 201

    emotion = client.post(
        "/emotions/logs",
        json={"mood": "ansioso", "emotions": ["ansiedade"], "intensity": 8, "stress": 7, "anxiety": 8},
        headers=user_headers,
    )
    assert emotion.status_code == 201

    report = client.post("/reports/emotional/me", headers=user_headers)
    assert report.status_code == 201
    assert report.json()["risk_level"] == "ELEVATED"

    unauthorized_professional = client.get("/professional/authorized-users", headers=psychologist_headers)
    assert unauthorized_professional.status_code == 200
    assert unauthorized_professional.json() == []

    professional_consent = client.post(
        "/sharing/consents",
        json={
            "target_identifier": psychologist_code.json()["connection_code"],
            "categories": ["MOOD", "TRENDS"],
            "summary_only": True,
        },
        headers=user_headers,
    )
    assert professional_consent.status_code == 201

    authorized_professional = client.get("/professional/authorized-users", headers=psychologist_headers)
    assert authorized_professional.status_code == 200
    authorized_payload = authorized_professional.json()
    assert len(authorized_payload) == 1
    assert authorized_payload[0]["latest_mood"] == "ansioso"
    assert authorized_payload[0]["average_intensity"] == 8.0
    assert authorized_payload[0]["journal_entries_visible"] == 0

    summary_detail = client.get(
        f"/professional/authorized-users/{authorized_payload[0]['user_id']}",
        headers=psychologist_headers,
    )
    assert summary_detail.status_code == 200
    assert summary_detail.json()["latest_mood"] == "ansioso"
    assert summary_detail.json()["average_intensity"] == 8.0
    assert summary_detail.json()["journal_entries"] == []
    assert summary_detail.json()["recent_emotions"] == []
    assert summary_detail.json()["latest_report"] is None

    detailed_professional_consent = client.post(
        "/sharing/consents",
        json={
            "target_identifier": psychologist_code.json()["connection_code"],
            "categories": ["MOOD", "TRENDS", "JOURNAL", "AI_SUMMARY"],
            "summary_only": False,
        },
        headers=user_headers,
    )
    assert detailed_professional_consent.status_code == 201

    detailed_view = client.get(
        f"/professional/authorized-users/{authorized_payload[0]['user_id']}",
        headers=psychologist_headers,
    )
    assert detailed_view.status_code == 200
    detailed_payload = detailed_view.json()
    assert detailed_payload["latest_report"]["risk_level"] == "ELEVATED"
    assert len(detailed_payload["journal_entries"]) == 1
    assert detailed_payload["journal_entries"][0]["content"] == "Hoje fiquei ansioso, mas consegui pedir ajuda."
    assert len(detailed_payload["recent_emotions"]) == 1
    assert detailed_payload["recent_emotions"][0]["mood"] == "ansioso"

    company_consent = client.post(
        "/sharing/consents",
        json={
            "target_email": "sharing-company@example.com",
            "categories": ["MOOD", "TRENDS"],
            "summary_only": True,
        },
        headers=user_headers,
    )
    assert company_consent.status_code == 201

    nr1 = client.get("/nr1/report", headers=company_headers)
    assert nr1.status_code == 200
    assert nr1.json()["participant_count"] == 1
    assert nr1.json()["suppressed"] is True
    assert "insuficiente" in nr1.json()["summary"]

    revoke = client.delete(f"/sharing/consents/{professional_consent.json()['id']}", headers=user_headers)
    assert revoke.status_code == 204
    after_revoke = client.get("/professional/authorized-users", headers=psychologist_headers)
    assert after_revoke.status_code == 200
    assert after_revoke.json() == []


def test_user_care_reminders_require_consent_and_stay_user_owned() -> None:
    register = client.post(
        "/auth/register",
        json={
            "email": "assistant-user@example.com",
            "full_name": "Pessoa Rotina",
            "password": "strongpass123",
            "role": "USER",
            "document": "71402513046",
            "lgpdConsent": True,
        },
    )
    assert register.status_code == 201
    headers = {"Authorization": f"Bearer {register.json()['access_token']}"}

    blocked = client.post(
        "/assistant/reminders",
        json={"title": "Beber agua", "category": "WATER", "cadence": "DAILY", "time_local": "09:30"},
        headers=headers,
    )
    assert blocked.status_code == 403
    assert blocked.json()["detail"] == "LGPD consent required"

    consent_status = client.get("/privacy/consent", headers=headers)
    client.post(
        "/privacy/consent",
        json={"policy_version": consent_status.json()["policy_version"]},
        headers=headers,
    )

    created = client.post(
        "/assistant/reminders",
        json={
            "title": "Beber agua",
            "category": "WATER",
            "cadence": "DAILY",
            "time_local": "09:30",
            "note": "Um copo pequeno ja basta.",
        },
        headers=headers,
    )
    assert created.status_code == 201
    reminder = created.json()
    assert reminder["title"] == "Beber agua"
    assert reminder["category"] == "WATER"
    assert reminder["last_completed_at"] is None

    listed = client.get("/assistant/reminders", headers=headers)
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [reminder["id"]]

    completed = client.post(f"/assistant/reminders/{reminder['id']}/complete", headers=headers)
    assert completed.status_code == 200
    assert completed.json()["last_completed_at"] is not None

    db = SessionLocal()
    try:
        actions = {entry.action for entry in db.query(AuditLog).all()}
    finally:
        db.close()
    assert AuditAction.CARE_REMINDER_CREATED in actions
    assert AuditAction.CARE_REMINDER_COMPLETED in actions


def test_non_user_cannot_use_personal_care_reminders_after_approval() -> None:
    register = client.post(
        "/auth/register",
        json={
            "email": "assistant-company@example.com",
            "full_name": "Empresa Rotina",
            "password": "strongpass123",
            "role": "COMPANY",
            "document": "99888777000100",
            "lgpdConsent": True,
        },
    )
    assert register.status_code == 201
    data = register.json()
    db = SessionLocal()
    try:
        user = db.get(User, data["user"]["id"])
        assert user is not None
        user.status = AccountStatus.ACTIVE
        user.subscription_status = SubscriptionStatus.ACTIVE
        db.commit()
    finally:
        db.close()

    headers = {"Authorization": f"Bearer {data['access_token']}"}
    consent_status = client.get("/privacy/consent", headers=headers)
    client.post(
        "/privacy/consent",
        json={"policy_version": consent_status.json()["policy_version"]},
        headers=headers,
    )

    response = client.post(
        "/assistant/reminders",
        json={"title": "Pausa leve", "category": "PAUSE", "cadence": "DAILY"},
        headers=headers,
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Only common users can create reminders"


def test_super_admin_can_manage_paid_subscription_status(monkeypatch) -> None:
    register = client.post(
        "/auth/register",
        json={
            "email": "billing-company@example.com",
            "full_name": "Empresa Billing",
            "password": "strongpass123",
            "role": "COMPANY",
            "document": "12345678000195",
            "lgpdConsent": True,
        },
    )
    assert register.status_code == 201
    company_id = register.json()["user"]["id"]

    db = SessionLocal()
    try:
        admin = User(
            email="billing-admin@example.com",
            full_name="Admin Billing",
            password_hash=hash_password("strongpass123"),
            role=UserRole.SUPER_ADMIN,
            status=AccountStatus.ACTIVE,
            subscription_plan="INTERNAL",
            subscription_status=SubscriptionStatus.ACTIVE,
        )
        db.add(admin)
        company = db.get(User, company_id)
        assert company is not None
        company.status = AccountStatus.ACTIVE
        company.subscription_status = SubscriptionStatus.ACTIVE
        db.commit()
    finally:
        db.close()

    admin_login = client.post(
        "/auth/login",
        json={"email": "billing-admin@example.com", "password": "strongpass123"},
    )
    assert admin_login.status_code == 200
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    listed = client.get("/admin/subscriptions", headers=admin_headers)
    assert listed.status_code == 200
    assert any(account["email"] == "billing-company@example.com" for account in listed.json())

    plans = client.get("/admin/commercial-plans", headers=admin_headers)
    assert plans.status_code == 200
    plans_payload = plans.json()
    assert all(plan["checkout_public_enabled"] is False for plan in plans_payload)
    assert all(plan["admin_only_pricing"] is True for plan in plans_payload)
    company_plan = next(plan for plan in plans_payload if plan["role"] == "COMPANY")
    assert company_plan["plan"] == "COMPANY_NR1"
    assert company_plan["price_brl"] == 499.9
    assert "Painel NR-1" in company_plan["included_features"]

    public_plans = client.get("/admin/commercial-plans")
    assert public_plans.status_code in {401, 403}

    past_due = client.post(
        "/admin/subscription-status",
        json={"user_id": company_id, "subscription_status": "PAST_DUE", "reason": "manual billing check"},
        headers=admin_headers,
    )
    assert past_due.status_code == 200
    assert past_due.json()["status"] == "PAST_DUE"

    company_headers = {"Authorization": f"Bearer {register.json()['access_token']}"}
    blocked = client.get("/nr1/report", headers=company_headers)
    assert blocked.status_code == 402

    active = client.post(
        "/admin/subscription-status",
        json={"user_id": company_id, "subscription_status": "ACTIVE", "reason": "manual payment confirmed"},
        headers=admin_headers,
    )
    assert active.status_code == 200
    assert active.json()["status"] == "ACTIVE"

    invalid_reference = client.post(
        "/admin/billing-reference",
        json={
            "user_id": company_id,
            "billing_provider": "PAGSEGURO",
            "billing_customer_id": "cus_test_company",
            "billing_subscription_id": "sub_test_company",
            "billing_last_event_id": "evt_test_company",
            "reason": "wrong provider ids",
        },
        headers=admin_headers,
    )
    assert invalid_reference.status_code == 422

    reference = client.post(
        "/admin/billing-reference",
        json={
            "user_id": company_id,
            "billing_provider": "STRIPE",
            "billing_customer_id": "cus_test_company",
            "billing_subscription_id": "sub_test_company",
            "billing_last_event_id": "evt_test_company",
            "reason": "external provider linked",
        },
        headers=admin_headers,
    )
    assert reference.status_code == 200
    assert reference.json()["billing_provider"] == "STRIPE"
    assert reference.json()["billing_customer_id"] == "cus_test_company"
    assert reference.json()["billing_subscription_id"] == "sub_test_company"

    listed_after_reference = client.get("/admin/subscriptions", headers=admin_headers)
    assert listed_after_reference.status_code == 200
    company_payload = next(
        account for account in listed_after_reference.json() if account["email"] == "billing-company@example.com"
    )
    assert company_payload["billing_provider"] == "STRIPE"
    assert company_payload["billing_customer_id"] == "cus_test_company"
    assert company_payload["billing_subscription_id"] == "sub_test_company"

    audit = client.get("/admin/audit-logs?resource_type=billing_reference&limit=10", headers=admin_headers)
    assert audit.status_code == 200
    billing_reference_log = next(entry for entry in audit.json() if entry["target_user_id"] == company_id)
    assert billing_reference_log["metadata"]["billing_provider"] == "STRIPE"
    assert billing_reference_log["metadata"]["previous"]["billing_provider"] is None

    config = client.get("/admin/billing-config", headers=admin_headers)
    assert config.status_code == 200
    config_payload = config.json()
    assert config_payload["webhook_path"] == "/billing/webhook"
    assert config_payload["signature_header"] == "X-Bergmann-Billing-Signature"
    assert config_payload["secret_env_name"] == "BILLING_WEBHOOK_SECRET"
    assert "STRIPE" in config_payload["supported_providers"]
    assert "MERCADO_PAGO" not in config_payload["supported_providers"]
    assert "billing_webhook_secret" not in config_payload

    email_config = client.get("/admin/email-config", headers=admin_headers)
    assert email_config.status_code == 200
    email_config_payload = email_config.json()
    assert email_config_payload["smtp_configured"] is False
    assert "SMTP_PASSWORD" in email_config_payload["required_env_names"]
    assert set(email_config_payload) == {
        "smtp_configured",
        "smtp_host_configured",
        "smtp_username_configured",
        "smtp_password_configured",
        "smtp_from_email_configured",
        "smtp_use_tls",
        "smtp_port",
        "password_reset_url_configured",
        "required_env_names",
    }
    stripe_config = next(
        capability
        for capability in config_payload["provider_capabilities"]
        if capability["provider"] == "STRIPE"
    )
    assert stripe_config["checkout_enabled"] is False
    assert "Stripe-Signature" in stripe_config["webhook_signature_headers"]
    assert "customer" in stripe_config["customer_reference_fields"]
    assert "STRIPE_WEBHOOK_SECRET" in stripe_config["required_env_names"]
    assert "STRIPE_SECRET_KEY" in stripe_config["required_env_names"]
    assert stripe_config["provider_configured"] is False
    assert stripe_config["production_enabled"] is False
    assert "stripe_secret_key" not in config_payload
    assert "stripe_webhook_secret" not in config_payload

    settings = get_settings()
    previous_stripe_secret_key = settings.stripe_secret_key
    previous_stripe_publishable_key = settings.stripe_publishable_key
    previous_stripe_webhook_secret = settings.stripe_webhook_secret
    settings.stripe_secret_key = "sk_live_123"
    settings.stripe_publishable_key = "pk_live_123"
    settings.stripe_webhook_secret = "whsec_live"
    try:
        configured_config = client.get("/admin/billing-config", headers=admin_headers)
        assert configured_config.status_code == 200
        configured_stripe_config = next(
            capability
            for capability in configured_config.json()["provider_capabilities"]
            if capability["provider"] == "STRIPE"
        )
        assert configured_stripe_config["provider_configured"] is True
        assert configured_stripe_config["production_enabled"] is True
        assert configured_stripe_config["checkout_enabled"] is False
        assert "sk_live_123" not in configured_config.text
        assert "whsec_live" not in configured_config.text
    finally:
        settings.stripe_secret_key = previous_stripe_secret_key
        settings.stripe_publishable_key = previous_stripe_publishable_key
        settings.stripe_webhook_secret = previous_stripe_webhook_secret

    missing_stripe_checkout = client.post(
        "/admin/stripe/checkout-session",
        json={"user_id": company_id},
        headers=admin_headers,
    )
    assert missing_stripe_checkout.status_code == 503
    assert "Stripe credentials are not configured" in missing_stripe_checkout.text

    captured_stripe_request: dict[str, object] = {}

    class FakeStripeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {
                "id": "cs_live_company",
                "url": "https://checkout.stripe.com/c/pay/cs_live_company",
                "livemode": True,
            }

    def fake_stripe_post(url, **kwargs):
        captured_stripe_request["url"] = url
        captured_stripe_request.update(kwargs)
        return FakeStripeResponse()

    previous_stripe_secret_key = settings.stripe_secret_key
    previous_stripe_publishable_key = settings.stripe_publishable_key
    previous_stripe_webhook_secret = settings.stripe_webhook_secret
    previous_stripe_success_url = settings.stripe_success_url
    previous_stripe_cancel_url = settings.stripe_cancel_url
    previous_stripe_price_id_company = settings.stripe_price_id_company
    settings.stripe_secret_key = "sk_live_123"
    settings.stripe_publishable_key = "pk_live_123"
    settings.stripe_webhook_secret = "whsec_live"
    settings.stripe_success_url = "https://app.example.com/success"
    settings.stripe_cancel_url = "https://app.example.com/cancel"
    settings.stripe_price_id_company = "price_company"
    monkeypatch.setattr("app.services.stripe.httpx.post", fake_stripe_post)
    try:
        stripe_checkout = client.post(
            "/admin/stripe/checkout-session",
            json={"user_id": company_id, "reason": "admin checkout"},
            headers=admin_headers,
        )
        assert stripe_checkout.status_code == 200
        stripe_checkout_payload = stripe_checkout.json()
        assert stripe_checkout_payload["provider"] == "STRIPE"
        assert stripe_checkout_payload["session_id"] == "cs_live_company"
        assert stripe_checkout_payload["checkout_url"].startswith("https://checkout.stripe.com/")
        assert stripe_checkout_payload["live_mode"] is True
        assert captured_stripe_request["url"] == "https://api.stripe.com/v1/checkout/sessions"
        assert captured_stripe_request["headers"]["Authorization"] == "Bearer sk_live_123"
        stripe_body = captured_stripe_request["content"]
        assert "mode=subscription" in stripe_body
        assert f"client_reference_id={company_id}" in stripe_body
        assert "line_items%5B0%5D%5Bprice%5D=price_company" in stripe_body
    finally:
        settings.stripe_secret_key = previous_stripe_secret_key
        settings.stripe_publishable_key = previous_stripe_publishable_key
        settings.stripe_webhook_secret = previous_stripe_webhook_secret
        settings.stripe_success_url = previous_stripe_success_url
        settings.stripe_cancel_url = previous_stripe_cancel_url
        settings.stripe_price_id_company = previous_stripe_price_id_company


def test_payment_provider_adapters_are_local_only_contracts() -> None:
    stripe = get_payment_adapter("stripe")
    assert stripe.extract_event_reference({"id": "evt_123"}) == "evt_123"
    assert (
        stripe.extract_customer_reference(
            {"data": {"object": {"customer": "cus_123", "subscription": "sub_123"}}}
        )
        == "cus_123"
    )
    assert (
        stripe.extract_subscription_reference(
            {"data": {"object": {"customer": "cus_123", "subscription": "sub_123"}}}
        )
        == "sub_123"
    )

    try:
        stripe.verify_provider_signature(raw_body=b"{}", headers={}, secret=None)
    except PaymentProviderNotConfigured:
        pass
    else:
        raise AssertionError("Provider signature validation must stay disabled until integration")

    assert validate_billing_reference(
        provider="STRIPE",
        customer_id="cus_123",
        subscription_id="sub_123",
        last_event_id="evt_123",
    ) == []
    assert validate_billing_reference(
        provider=None,
        customer_id="cus_123",
        subscription_id=None,
        last_event_id=None,
    ) == ["Provider NONE cannot keep external billing IDs"]


def test_billing_webhook_is_disabled_by_default() -> None:
    settings = get_settings()
    previous_enabled = settings.billing_webhooks_enabled
    previous_secret = settings.billing_webhook_secret
    settings.billing_webhooks_enabled = False
    settings.billing_webhook_secret = "test-billing-secret"
    try:
        response = client.post("/billing/webhook", json={"event_id": "evt_disabled"})
        assert response.status_code == 404
        assert response.json()["detail"] == "Billing webhooks disabled"
    finally:
        settings.billing_webhooks_enabled = previous_enabled
        settings.billing_webhook_secret = previous_secret


def test_billing_webhook_requires_valid_signature_and_is_idempotent() -> None:
    settings = get_settings()
    previous_enabled = settings.billing_webhooks_enabled
    previous_secret = settings.billing_webhook_secret
    settings.billing_webhooks_enabled = True
    settings.billing_webhook_secret = "test-billing-secret"
    try:
        db = SessionLocal()
        try:
            company = User(
                email="webhook-company@example.com",
                full_name="Empresa Webhook",
                password_hash=hash_password("strongpass123"),
                role=UserRole.COMPANY,
                status=AccountStatus.ACTIVE,
                subscription_plan="COMPANY_NR1",
                subscription_status=SubscriptionStatus.PAST_DUE,
                billing_provider="STRIPE",
                billing_customer_id="cus_webhook_company",
                billing_subscription_id="sub_webhook_company",
            )
            db.add(company)
            db.commit()
            company_id = company.id
        finally:
            db.close()

        payload = {
            "provider": "STRIPE",
            "event_id": "evt_webhook_paid",
            "external_status": "active",
            "customer_id": "cus_webhook_company",
            "subscription_id": "sub_webhook_company",
        }
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")

        invalid = client.post(
            "/billing/webhook",
            content=body,
            headers={"Content-Type": "application/json", "X-Bergmann-Billing-Signature": "invalid"},
        )
        assert invalid.status_code == 401

        signature = build_signature(body, settings.billing_webhook_secret)
        processed = client.post(
            "/billing/webhook",
            content=body,
            headers={"Content-Type": "application/json", "X-Bergmann-Billing-Signature": signature},
        )
        assert processed.status_code == 200
        assert processed.json()["status"] == "processed"
        assert processed.json()["user_id"] == company_id
        assert processed.json()["subscription_status"] == "ACTIVE"

        duplicate = client.post(
            "/billing/webhook",
            content=body,
            headers={"Content-Type": "application/json", "X-Bergmann-Billing-Signature": signature},
        )
        assert duplicate.status_code == 200
        assert duplicate.json()["status"] == "duplicate"
        assert duplicate.json()["duplicate"] is True

        db = SessionLocal()
        try:
            company = db.get(User, company_id)
            assert company is not None
            assert company.subscription_status == SubscriptionStatus.ACTIVE
            assert company.billing_last_event_id == "evt_webhook_paid"
            actions = {entry.action for entry in db.query(AuditLog).all()}
        finally:
            db.close()
        assert AuditAction.BILLING_WEBHOOK_PROCESSED in actions
    finally:
        settings.billing_webhooks_enabled = previous_enabled
        settings.billing_webhook_secret = previous_secret
