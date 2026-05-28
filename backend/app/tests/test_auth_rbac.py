import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-with-more-than-thirty-two-chars")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:8081")

from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.privacy import AuditAction, AuditLog

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
        },
    )
    assert response.status_code == 400


def test_user_register_login_and_access_common_area() -> None:
    register = client.post(
        "/auth/register",
        json={
            "email": "user@example.com",
            "full_name": "Pessoa User",
            "password": "strongpass123",
            "role": "USER",
        },
    )
    assert register.status_code == 201
    data = register.json()
    assert data["user"]["status"] == "ACTIVE"

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
            "lgpdConsent": False,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["full_name"] == "Pessoa Alias"
    assert data["user"]["role"] == "USER"
    assert data["user"]["status"] == "ACTIVE"


def test_non_user_registration_is_pending_and_blocked_from_active_routes() -> None:
    register = client.post(
        "/auth/register",
        json={
            "email": "psi@example.com",
            "full_name": "Psicologa",
            "password": "strongpass123",
            "role": "PSYCHOLOGIST",
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


def test_e2e_user_consent_chat_sos_and_audit() -> None:
    register = client.post(
        "/auth/register",
        json={
            "email": "e2e-user@example.com",
            "full_name": "Pessoa E2E",
            "password": "strongpass123",
            "role": "USER",
        },
    )
    assert register.status_code == 201
    access_token = register.json()["access_token"]
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
    assert chat.json()["risk_level"] == "ELEVATED"

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
