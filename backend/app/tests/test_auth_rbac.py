import os
import json
import hmac
from hashlib import sha256

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
from app.api.admin import recent_scheduled_billing_pending_alert_exists, run_billing_pending_alert
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

    pending_register = client.post(
        "/auth/register",
        json={
            "email": "billing-company-pending@example.com",
            "full_name": "Empresa Billing Pendente",
            "password": "strongpass123",
            "role": "COMPANY",
            "document": "12345678000276",
            "lgpdConsent": True,
        },
    )
    assert pending_register.status_code == 201
    pending_checkout = client.post(
        "/admin/mercado-pago/checkout-preference",
        json={"user_id": pending_register.json()["user"]["id"]},
        headers=admin_headers,
    )
    assert pending_checkout.status_code == 400
    assert pending_checkout.json()["detail"] == "Account must be approved before checkout"

    listed = client.get("/admin/subscriptions", headers=admin_headers)
    assert listed.status_code == 200
    assert any(account["email"] == "billing-company@example.com" for account in listed.json())
    pending_company_payload = next(
        account for account in listed.json() if account["email"] == "billing-company-pending@example.com"
    )
    assert pending_company_payload["billing_activation_source"] == "NOT_ACTIVE"
    assert "ainda nao aprovada" in pending_company_payload["billing_activation_blocker"]

    plans = client.get("/admin/commercial-plans", headers=admin_headers)
    assert plans.status_code == 200
    plans_payload = plans.json()
    assert all(plan["checkout_public_enabled"] is False for plan in plans_payload)
    assert all(plan["admin_only_pricing"] is True for plan in plans_payload)
    company_plan = next(plan for plan in plans_payload if plan["role"] == "COMPANY")
    assert company_plan["plan"] == "COMPANY_NR1"
    assert company_plan["price_brl"] == 299.0
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
            "billing_customer_id": "billing-company@example.com",
            "billing_subscription_id": "123456789-company",
            "billing_last_event_id": "123456789",
            "reason": "wrong provider ids",
        },
        headers=admin_headers,
    )
    assert invalid_reference.status_code == 422

    reference = client.post(
        "/admin/billing-reference",
        json={
            "user_id": company_id,
            "billing_provider": "MERCADO_PAGO",
            "billing_customer_id": "billing-company@example.com",
            "billing_subscription_id": "123456789-company",
            "billing_last_event_id": "123456789",
            "reason": "external provider linked",
        },
        headers=admin_headers,
    )
    assert reference.status_code == 200
    assert reference.json()["billing_provider"] == "MERCADO_PAGO"
    assert reference.json()["billing_customer_id"] == "billing-company@example.com"
    assert reference.json()["billing_subscription_id"] == "123456789-company"

    listed_after_reference = client.get("/admin/subscriptions", headers=admin_headers)
    assert listed_after_reference.status_code == 200
    company_payload = next(
        account for account in listed_after_reference.json() if account["email"] == "billing-company@example.com"
    )
    assert company_payload["billing_provider"] == "MERCADO_PAGO"
    assert company_payload["billing_customer_id"] == "billing-company@example.com"
    assert company_payload["billing_subscription_id"] == "123456789-company"
    assert company_payload["billing_activation_source"] == "ADMIN_OR_MANUAL"
    assert company_payload["billing_activation_blocker"] is None
    assert company_payload["billing_last_payment_received_at"] is None
    assert "billing_last_checkout_at" in company_payload
    assert "billing_last_webhook_status" in company_payload

    pending_billing = client.get("/admin/billing-pending-accounts", headers=admin_headers)
    assert pending_billing.status_code == 200
    pending_billing_payload = pending_billing.json()
    company_pending_payload = next(
        account for account in pending_billing_payload if account["email"] == "billing-company@example.com"
    )
    assert company_pending_payload["billing_financial_pending_reason"] == (
        "Conta ativa manualmente, mas sem webhook de pagamento confirmado."
    )
    assert company_pending_payload["billing_activation_source"] == "ADMIN_OR_MANUAL"

    captured_admin_alert: dict[str, str] = {}

    def fake_admin_alert_email(*, subject: str, body: str) -> bool:
        captured_admin_alert["subject"] = subject
        captured_admin_alert["body"] = body
        return True

    monkeypatch.setattr("app.api.admin.send_admin_alert_email", fake_admin_alert_email)
    pending_alert = client.post("/admin/billing-pending-alerts?days=0", headers=admin_headers)
    assert pending_alert.status_code == 200
    pending_alert_payload = pending_alert.json()
    assert pending_alert_payload["checked_accounts"] >= 1
    assert pending_alert_payload["pending_accounts"] >= 1
    assert pending_alert_payload["alerted_accounts"] >= 1
    assert pending_alert_payload["email_sent"] is True
    assert any(account["email"] == "billing-company@example.com" for account in pending_alert_payload["accounts"])
    assert "billing-company@example.com" in captured_admin_alert["body"]
    assert "pendencia financeira" in captured_admin_alert["subject"].lower()

    audit = client.get("/admin/audit-logs?resource_type=billing_reference&limit=10", headers=admin_headers)
    assert audit.status_code == 200
    billing_reference_log = next(entry for entry in audit.json() if entry["target_user_id"] == company_id)
    assert billing_reference_log["metadata"]["billing_provider"] == "MERCADO_PAGO"
    assert billing_reference_log["metadata"]["previous"]["billing_provider"] is None

    alert_audit = client.get("/admin/audit-logs?resource_type=billing_pending_alert&limit=10", headers=admin_headers)
    assert alert_audit.status_code == 200
    alert_log = alert_audit.json()[0]
    assert alert_log["metadata"]["email_sent"] is True
    assert company_id in alert_log["metadata"]["account_ids"]

    pending_alerts = client.get("/admin/alerts?alert_type=PENDING_FINANCIAL", headers=admin_headers)
    assert pending_alerts.status_code == 200
    pending_alerts_payload = pending_alerts.json()
    assert pending_alerts_payload[0]["alert_type"] == "PENDING_FINANCIAL"
    assert pending_alerts_payload[0]["email_sent"] is True
    assert pending_alerts_payload[0]["trigger"] == "manual"
    assert pending_alerts_payload[0]["days_threshold"] == 0
    assert pending_alerts_payload[0]["checked_accounts"] >= 1
    assert pending_alerts_payload[0]["pending_accounts"] >= 1
    assert pending_alerts_payload[0]["alerted_accounts"] >= 1

    manual_pending_alerts = client.get("/admin/alerts?alert_type=PENDING_FINANCIAL&trigger=manual", headers=admin_headers)
    assert manual_pending_alerts.status_code == 200
    assert manual_pending_alerts.json()[0]["trigger"] == "manual"

    searched_pending_alerts = client.get(
        "/admin/alerts?alert_type=PENDING_FINANCIAL&q=pendencia%20financeira",
        headers=admin_headers,
    )
    assert searched_pending_alerts.status_code == 200
    assert searched_pending_alerts.json()[0]["alert_type"] == "PENDING_FINANCIAL"

    db = SessionLocal()
    try:
        scheduled_alert = run_billing_pending_alert(db, days=0, limit=50, trigger="scheduled")
        assert scheduled_alert.alerted_accounts >= 1
        assert recent_scheduled_billing_pending_alert_exists(db, interval_hours=24) is True
    finally:
        db.close()

    alert_status = client.get("/admin/billing-pending-alert-status", headers=admin_headers)
    assert alert_status.status_code == 200
    alert_status_payload = alert_status.json()
    assert alert_status_payload["auto_enabled"] is False
    assert alert_status_payload["last_scheduled_email_sent"] is True
    assert alert_status_payload["last_scheduled_alerted_accounts"] >= 1
    assert alert_status_payload["recent_scheduled_alert_exists"] is True
    assert alert_status_payload["next_allowed_alert_at"]

    config = client.get("/admin/billing-config", headers=admin_headers)
    assert config.status_code == 200
    config_payload = config.json()
    assert config_payload["webhook_path"] == "/billing/mercado-pago/webhook"
    assert config_payload["signature_header"] == "x-signature, x-request-id"
    assert config_payload["secret_env_name"] == "MERCADO_PAGO_WEBHOOK_SECRET"
    assert "MERCADO_PAGO" in config_payload["supported_providers"]
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
        "admin_alert_recipient_configured",
        "billing_pending_alerts_auto_enabled",
        "billing_pending_alerts_auto_days",
        "billing_pending_alerts_auto_interval_hours",
        "billing_pending_alerts_auto_limit",
        "password_reset_url_configured",
        "required_env_names",
    }
    assert email_config_payload["billing_pending_alerts_auto_enabled"] is False
    assert "BILLING_PENDING_ALERTS_AUTO_ENABLED" in email_config_payload["required_env_names"]
    mercado_pago_config = next(
        capability
        for capability in config_payload["provider_capabilities"]
        if capability["provider"] == "MERCADO_PAGO"
    )
    assert mercado_pago_config["checkout_enabled"] is False
    assert "x-signature" in mercado_pago_config["webhook_signature_headers"]
    assert "x-request-id" in mercado_pago_config["webhook_signature_headers"]
    assert "payer.email" in mercado_pago_config["customer_reference_fields"]
    assert "MERCADO_PAGO_WEBHOOK_SECRET" in mercado_pago_config["required_env_names"]
    assert "MERCADO_PAGO_ACCESS_TOKEN" in mercado_pago_config["required_env_names"]
    assert mercado_pago_config["provider_configured"] is False
    assert mercado_pago_config["production_enabled"] is False
    assert "mercado_pago_access_token" not in config_payload
    assert "mercado_pago_webhook_secret" not in config_payload

    settings = get_settings()
    previous_access_token = settings.mercado_pago_access_token
    previous_public_key = settings.mercado_pago_public_key
    previous_webhook_secret = settings.mercado_pago_webhook_secret
    settings.mercado_pago_access_token = "APP_USR-live-token"
    settings.mercado_pago_public_key = "APP_USR-live-public"
    settings.mercado_pago_webhook_secret = "mp_webhook_secret"
    try:
        configured_config = client.get("/admin/billing-config", headers=admin_headers)
        assert configured_config.status_code == 200
        configured_mercado_pago_config = next(
            capability
            for capability in configured_config.json()["provider_capabilities"]
            if capability["provider"] == "MERCADO_PAGO"
        )
        assert configured_mercado_pago_config["provider_configured"] is True
        assert configured_mercado_pago_config["production_enabled"] is True
        assert configured_mercado_pago_config["checkout_enabled"] is True
        assert "APP_USR-live-token" not in configured_config.text
        assert "mp_webhook_secret" not in configured_config.text
    finally:
        settings.mercado_pago_access_token = previous_access_token
        settings.mercado_pago_public_key = previous_public_key
        settings.mercado_pago_webhook_secret = previous_webhook_secret

    missing_mercado_pago_checkout = client.post(
        "/admin/mercado-pago/checkout-preference",
        json={"user_id": company_id},
        headers=admin_headers,
    )
    assert missing_mercado_pago_checkout.status_code == 503
    assert "Mercado Pago credentials are not configured" in missing_mercado_pago_checkout.text

    captured_mercado_pago_request: dict[str, object] = {}

    class FakeMercadoPagoResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {
                "id": "123456789-company-preference",
                "init_point": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=123456789-company-preference",
            }

    def fake_mercado_pago_post(url, **kwargs):
        captured_mercado_pago_request["url"] = url
        captured_mercado_pago_request.update(kwargs)
        return FakeMercadoPagoResponse()

    previous_access_token = settings.mercado_pago_access_token
    previous_public_key = settings.mercado_pago_public_key
    previous_webhook_secret = settings.mercado_pago_webhook_secret
    previous_success_url = settings.mercado_pago_success_url
    previous_pending_url = settings.mercado_pago_pending_url
    previous_failure_url = settings.mercado_pago_failure_url
    settings.mercado_pago_access_token = "APP_USR-live-token"
    settings.mercado_pago_public_key = "APP_USR-live-public"
    settings.mercado_pago_webhook_secret = "mp_webhook_secret"
    settings.mercado_pago_success_url = "https://app.example.com/success"
    settings.mercado_pago_pending_url = "https://app.example.com/pending"
    settings.mercado_pago_failure_url = "https://app.example.com/failure"
    monkeypatch.setattr("app.services.mercado_pago.httpx.post", fake_mercado_pago_post)
    try:
        mercado_pago_checkout = client.post(
            "/admin/mercado-pago/checkout-preference",
            json={"user_id": company_id, "reason": "admin checkout"},
            headers=admin_headers,
        )
        assert mercado_pago_checkout.status_code == 200
        mercado_pago_payload = mercado_pago_checkout.json()
        assert mercado_pago_payload["provider"] == "MERCADO_PAGO"
        assert mercado_pago_payload["preference_id"] == "123456789-company-preference"
        assert mercado_pago_payload["checkout_url"].startswith("https://www.mercadopago.com.br/")
        assert captured_mercado_pago_request["url"] == "https://api.mercadopago.com/checkout/preferences"
        assert captured_mercado_pago_request["headers"]["Authorization"] == "Bearer APP_USR-live-token"
        mercado_pago_body = captured_mercado_pago_request["json"]
        assert mercado_pago_body["external_reference"] == company_id
        assert mercado_pago_body["items"][0]["currency_id"] == "BRL"
        assert mercado_pago_body["back_urls"]["success"] == "https://app.example.com/success"
    finally:
        settings.mercado_pago_access_token = previous_access_token
        settings.mercado_pago_public_key = previous_public_key
        settings.mercado_pago_webhook_secret = previous_webhook_secret
        settings.mercado_pago_success_url = previous_success_url
        settings.mercado_pago_pending_url = previous_pending_url
        settings.mercado_pago_failure_url = previous_failure_url


def test_payment_provider_adapters_are_local_only_contracts() -> None:
    mercado_pago = get_payment_adapter("mercado_pago")
    assert mercado_pago.extract_event_reference({"data": {"id": "123456"}}) == "123456"
    assert (
        mercado_pago.extract_customer_reference(
            {"payer": {"email": "pagador@example.com"}, "external_reference": "user_123"}
        )
        == "pagador@example.com"
    )
    assert mercado_pago.extract_subscription_reference({"preference_id": "123456789-pref"}) == "123456789-pref"

    try:
        mercado_pago.verify_provider_signature(raw_body=b"{}", headers={}, secret=None)
    except PaymentProviderNotConfigured:
        pass
    else:
        raise AssertionError("Provider signature validation must stay disabled until integration")

    assert validate_billing_reference(
        provider="MERCADO_PAGO",
        customer_id="pagador@example.com",
        subscription_id="123456789-pref",
        last_event_id="123456",
    ) == []
    assert validate_billing_reference(
        provider=None,
        customer_id="cus_123",
        subscription_id=None,
        last_event_id=None,
    ) == ["Provider NONE cannot keep external billing IDs"]


def test_scheduled_billing_pending_alert_records_noop_run() -> None:
    db = SessionLocal()
    try:
        admin = User(
            email="noop-alert-admin@example.com",
            full_name="Noop Alert Admin",
            password_hash=hash_password("strongpass123"),
            role=UserRole.SUPER_ADMIN,
            status=AccountStatus.ACTIVE,
            subscription_plan="INTERNAL",
            subscription_status=SubscriptionStatus.ACTIVE,
        )
        company = User(
            email="noop-alert-company@example.com",
            full_name="Empresa Sem Pendencia",
            password_hash=hash_password("strongpass123"),
            role=UserRole.COMPANY,
            status=AccountStatus.ACTIVE,
            subscription_plan="COMPANY_NR1",
            subscription_status=SubscriptionStatus.ACTIVE,
            billing_provider="MERCADO_PAGO",
            billing_customer_id="noop-alert-company@example.com",
            billing_subscription_id="noop-alert-subscription",
            billing_last_event_id="noop-alert-event",
        )
        db.add(admin)
        db.add(company)
        db.commit()
        admin_email = admin.email
    finally:
        db.close()

    admin_login = client.post("/auth/login", json={"email": admin_email, "password": "strongpass123"})
    assert admin_login.status_code == 200
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    db = SessionLocal()
    try:
        result = run_billing_pending_alert(db, days=365, limit=50, trigger="scheduled")
        assert result.alerted_accounts == 0
        assert result.email_sent is False
        assert recent_scheduled_billing_pending_alert_exists(db, interval_hours=24) is True
    finally:
        db.close()

    alert_status = client.get("/admin/billing-pending-alert-status", headers=admin_headers)
    assert alert_status.status_code == 200
    payload = alert_status.json()
    assert payload["last_scheduled_email_sent"] is False
    assert payload["last_scheduled_alerted_accounts"] == 0
    assert payload["recent_scheduled_alert_exists"] is True

    alerts = client.get("/admin/alerts?alert_type=PENDING_FINANCIAL", headers=admin_headers)
    assert alerts.status_code == 200
    latest = alerts.json()[0]
    assert latest["trigger"] == "scheduled"
    assert latest["days_threshold"] == 365
    assert latest["alerted_accounts"] == 0
    assert latest["email_sent"] is False

    scheduled_alerts = client.get("/admin/alerts?alert_type=PENDING_FINANCIAL&trigger=scheduled", headers=admin_headers)
    assert scheduled_alerts.status_code == 200
    assert scheduled_alerts.json()[0]["trigger"] == "scheduled"


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
            admin = User(
                email="webhook-monitor-admin@example.com",
                full_name="Webhook Monitor Admin",
                password_hash=hash_password("strongpass123"),
                role=UserRole.SUPER_ADMIN,
                status=AccountStatus.ACTIVE,
                subscription_plan="INTERNAL",
                subscription_status=SubscriptionStatus.ACTIVE,
            )
            company = User(
                email="webhook-company@example.com",
                full_name="Empresa Webhook",
                password_hash=hash_password("strongpass123"),
                role=UserRole.COMPANY,
                status=AccountStatus.ACTIVE,
                subscription_plan="COMPANY_NR1",
                subscription_status=SubscriptionStatus.PAST_DUE,
                billing_provider="MERCADO_PAGO",
                billing_customer_id="webhook-company@example.com",
                billing_subscription_id="123456789-webhook-company",
            )
            db.add(admin)
            db.add(company)
            db.commit()
            company_id = company.id
        finally:
            db.close()

        event_id = f"mp_{company_id}"
        payload = {
            "provider": "MERCADO_PAGO",
            "event_id": event_id,
            "external_status": "active",
            "customer_id": "webhook-company@example.com",
            "subscription_id": "123456789-webhook-company",
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

        missing_account_payload = {
            "provider": "MERCADO_PAGO",
            "event_id": f"missing_{company_id}",
            "external_status": "active",
            "customer_id": "missing-webhook-company@example.com",
            "subscription_id": "missing-webhook-subscription",
        }
        missing_body = json.dumps(missing_account_payload, separators=(",", ":")).encode("utf-8")
        missing_signature = build_signature(missing_body, settings.billing_webhook_secret)
        missing = client.post(
            "/billing/webhook",
            content=missing_body,
            headers={"Content-Type": "application/json", "X-Bergmann-Billing-Signature": missing_signature},
        )
        assert missing.status_code == 404
        assert missing.json()["detail"] == "Billing account not found"

        admin_login = client.post(
            "/auth/login",
            json={"email": "webhook-monitor-admin@example.com", "password": "strongpass123"},
        )
        assert admin_login.status_code == 200
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
        monitor = client.get("/admin/billing-webhooks", headers=admin_headers)
        assert monitor.status_code == 200
        monitor_payload = monitor.json()
        assert any(entry["event_id"] == event_id and entry["processing_status"] == "processed" for entry in monitor_payload)
        assert any(entry["event_id"] == event_id and entry["processing_status"] == "duplicate" for entry in monitor_payload)
        missing_entry = next(entry for entry in monitor_payload if entry["event_id"] == f"missing_{company_id}")
        assert missing_entry["processing_status"] == "error"
        assert missing_entry["error"] == "Billing account not found"
        assert missing_entry["linked_user_email"] is None

        searched_monitor = client.get("/admin/billing-webhooks?q=webhook-company@example.com", headers=admin_headers)
        assert searched_monitor.status_code == 200
        assert any(entry["event_id"] == event_id for entry in searched_monitor.json())

        searched_error_monitor = client.get(
            "/admin/billing-webhooks?q=Billing%20account%20not%20found",
            headers=admin_headers,
        )
        assert searched_error_monitor.status_code == 200
        assert any(entry["event_id"] == f"missing_{company_id}" for entry in searched_error_monitor.json())

        alerts = client.get("/admin/alerts?alert_type=WEBHOOK_FAILURE", headers=admin_headers)
        assert alerts.status_code == 200
        alert_payload = alerts.json()
        missing_alert = next(entry for entry in alert_payload if entry["event_id"] == f"missing_{company_id}")
        assert missing_alert["alert_type"] == "WEBHOOK_FAILURE"
        assert missing_alert["source"] == "admin_email_alert"
        assert missing_alert["email_sent"] is False
        assert missing_alert["admin_recipient_configured"] is False
        assert missing_alert["error"] == "Billing account not found"

        db = SessionLocal()
        try:
            company = db.get(User, company_id)
            assert company is not None
            assert company.subscription_status == SubscriptionStatus.ACTIVE
            assert company.billing_last_event_id == event_id
            actions = {entry.action for entry in db.query(AuditLog).all()}
        finally:
            db.close()
        assert AuditAction.BILLING_WEBHOOK_PROCESSED in actions
    finally:
        settings.billing_webhooks_enabled = previous_enabled
        settings.billing_webhook_secret = previous_secret


def test_mercado_pago_webhook_validates_signature_and_updates_subscription(monkeypatch) -> None:
    settings = get_settings()
    previous_enabled = settings.billing_webhooks_enabled
    previous_webhook_secret = settings.mercado_pago_webhook_secret
    previous_access_token = settings.mercado_pago_access_token
    settings.billing_webhooks_enabled = True
    settings.mercado_pago_webhook_secret = "mp-webhook-secret"
    settings.mercado_pago_access_token = "APP_USR-live-token"
    try:
        db = SessionLocal()
        try:
            company = User(
                email="mp-webhook-company@example.com",
                full_name="Empresa Mercado Pago",
                password_hash=hash_password("strongpass123"),
                role=UserRole.COMPANY,
                status=AccountStatus.ACTIVE,
                subscription_plan="COMPANY_NR1",
                subscription_status=SubscriptionStatus.PAST_DUE,
                billing_provider="MERCADO_PAGO",
                billing_customer_id="mp-webhook-company@example.com",
                billing_subscription_id="pref-mp-company",
            )
            db.add(company)
            db.commit()
            company_id = company.id
        finally:
            db.close()

        payment_id = f"pay_{company_id}"
        request_id = "request-id-123"
        timestamp = "1710000000"
        manifest = f"id:{payment_id};request-id:{request_id};ts:{timestamp};"
        digest = hmac.new(settings.mercado_pago_webhook_secret.encode("utf-8"), manifest.encode("utf-8"), sha256)
        signature = f"ts={timestamp},v1={digest.hexdigest()}"

        class FakeMercadoPagoPaymentResponse:
            def raise_for_status(self) -> None:
                return None

            def json(self) -> dict[str, object]:
                return {
                    "id": payment_id,
                    "status": "approved",
                    "external_reference": company_id,
                    "payer": {"email": "mp-webhook-company@example.com"},
                }

        def fake_mercado_pago_get(url, **kwargs):
            assert payment_id in url
            assert kwargs["headers"]["Authorization"] == "Bearer APP_USR-live-token"
            return FakeMercadoPagoPaymentResponse()

        monkeypatch.setattr("app.services.mercado_pago.httpx.get", fake_mercado_pago_get)
        response = client.post(
            f"/billing/mercado-pago/webhook?data.id={payment_id}",
            json={"data": {"id": payment_id}},
            headers={"x-signature": signature, "x-request-id": request_id},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "processed"
        assert response.json()["subscription_status"] == "ACTIVE"

        duplicate = client.post(
            f"/billing/mercado-pago/webhook?data.id={payment_id}",
            json={"data": {"id": payment_id}},
            headers={"x-signature": signature, "x-request-id": request_id},
        )
        assert duplicate.status_code == 200
        assert duplicate.json()["status"] == "duplicate"

        db = SessionLocal()
        try:
            company = db.get(User, company_id)
            assert company is not None
            assert company.subscription_status == SubscriptionStatus.ACTIVE
            assert company.billing_last_event_id == payment_id
        finally:
            db.close()
    finally:
        settings.billing_webhooks_enabled = previous_enabled
        settings.mercado_pago_webhook_secret = previous_webhook_secret
        settings.mercado_pago_access_token = previous_access_token
