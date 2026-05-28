import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-with-more-than-thirty-two-chars")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:8081")
os.environ["APP_ENV"] = "test"

from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.privacy import AuditAction, AuditLog
from app.models.user import AccountStatus, User

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
    assert data["user"]["status"] == "PENDING_VERIFICATION"
    assert data["user"]["document_type"] == "CPF"
    assert data["user"]["document_last4"] == "4725"

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
    assert data["user"]["status"] == "PENDING_VERIFICATION"


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
    db = SessionLocal()
    try:
        user = db.get(User, data["user"]["id"])
        assert user is not None
        user.status = AccountStatus.ACTIVE
        db.commit()
    finally:
        db.close()

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
