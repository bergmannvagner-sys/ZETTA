import os
from uuid import uuid4

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-with-more-than-thirty-two-chars")
os.environ.setdefault("DATA_ENCRYPTION_KEY", "test-data-encryption-key-with-more-than-thirty-two-chars")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:8081")
os.environ["APP_ENV"] = "test"

from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.user import AccountStatus, SubscriptionStatus, User

Base.metadata.create_all(bind=engine)
client = TestClient(app)


def _activate_company_account(user_id: str) -> None:
    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        assert user is not None
        user.status = AccountStatus.ACTIVE
        user.subscription_status = SubscriptionStatus.ACTIVE
        db.commit()
    finally:
        db.close()


def _make_cnpj(base_12_digits: str) -> str:
    digits = [int(digit) for digit in base_12_digits]
    first_weights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    second_weights = [6, *first_weights]
    first_sum = sum(digits[index] * first_weights[index] for index in range(12))
    first_digit = 0 if first_sum % 11 < 2 else 11 - (first_sum % 11)
    second_sum = sum([*digits, first_digit][index] * second_weights[index] for index in range(13))
    second_digit = 0 if second_sum % 11 < 2 else 11 - (second_sum % 11)
    return f"{base_12_digits}{first_digit}{second_digit}"


def _register_company(email: str) -> dict[str, object]:
    document = _make_cnpj(f"{uuid4().int % 10**12:012d}")
    response = client.post(
        "/auth/register",
        json={
            "email": email,
            "full_name": "Empresa NR1",
            "password": "strongpass123",
            "role": "COMPANY",
            "document": document,
            "lgpdConsent": True,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_nr1_workspace_requires_lgpd_consent_and_premium_company_access() -> None:
    payload = _register_company(f"nr1-gate-{uuid4().hex[:8]}@example.com")
    _activate_company_account(payload["user"]["id"])
    headers = {"Authorization": f"Bearer {payload['access_token']}"}

    blocked = client.get("/nr1/workspace", headers=headers)
    assert blocked.status_code == 403
    assert blocked.json()["detail"] == "LGPD consent required"

    consent_status = client.get("/privacy/consent", headers=headers)
    assert consent_status.status_code == 200
    accepted = client.post(
        "/privacy/consent",
        json={"policy_version": consent_status.json()["policy_version"]},
        headers=headers,
    )
    assert accepted.status_code == 200

    workspace = client.get("/nr1/workspace", headers=headers)
    assert workspace.status_code == 200
    data = workspace.json()
    assert data["workspace"]["status"] == "DRAFT"
    assert data["summary"]["suppressed"] is True
    assert len(data["risks"]) >= 4
    assert len(data["actions"]) >= 4
    assert len(data["trainings"]) >= 3


def test_nr1_workspace_allows_basic_crud_after_consent() -> None:
    payload = _register_company(f"nr1-crud-{uuid4().hex[:8]}@example.com")
    _activate_company_account(payload["user"]["id"])
    headers = {"Authorization": f"Bearer {payload['access_token']}"}

    consent_status = client.get("/privacy/consent", headers=headers)
    client.post(
        "/privacy/consent",
        json={"policy_version": consent_status.json()["policy_version"]},
        headers=headers,
    )

    workspace_patch = client.patch(
        "/nr1/workspace",
        json={
            "organization_name": "Empresa NR1 Atualizada",
            "status": "IN_REVIEW",
            "scope_statement": "PGR/GRO para riscos psicossociais, pausas e comunicacao.",
        },
        headers=headers,
    )
    assert workspace_patch.status_code == 200
    assert workspace_patch.json()["workspace"]["organization_name"] == "Empresa NR1 Atualizada"
    assert workspace_patch.json()["workspace"]["status"] == "IN_REVIEW"

    created_risk = client.post(
        "/nr1/risks",
        json={
            "title": "Sobrecarga de turnos",
            "description": "Excesso de horas e pausas insuficientes.",
            "category": "PSYCHOSOCIAL",
            "source": "MANUAL",
            "severity": 5,
            "likelihood": 4,
            "owner_label": "RH",
            "status": "OPEN",
        },
        headers=headers,
    )
    assert created_risk.status_code == 201
    created_risk_payload = created_risk.json()
    created_risk_item = next(item for item in created_risk_payload["risks"] if item["title"] == "Sobrecarga de turnos")

    created_action = client.post(
        "/nr1/actions",
        json={
            "title": "Revisar jornada",
            "owner_label": "Operacao",
            "status": "PLANNED",
            "progress_percent": 0,
            "risk_item_id": created_risk_item["id"],
        },
        headers=headers,
    )
    assert created_action.status_code == 201
    assert any(item["title"] == "Revisar jornada" for item in created_action.json()["actions"])
