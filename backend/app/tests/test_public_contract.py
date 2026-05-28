import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-with-more-than-thirty-two-chars")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:8081")

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_public_openapi_contract_matches_mobile_mvp() -> None:
    openapi = client.get("/openapi.json").json()
    paths = set(openapi["paths"].keys())

    assert "/health" in paths
    assert "/auth/register" in paths
    assert "/auth/login" in paths
    assert "/auth/refresh" in paths
    assert "/auth/password-reset/request" in paths
    assert "/auth/password-reset/confirm" in paths
    assert "/users/me" in paths
    assert "/privacy/consent" in paths
    assert "/chat/message" in paths
    assert "/sos/event" in paths
    assert "/journal/entries" in paths
    assert "/emotions/logs" in paths
    assert "/sharing/consents" in paths
    assert "/reports/emotional/me" in paths
    assert "/professional/authorized-users" in paths
    assert "/nr1/report" in paths
    assert "/assistant/reminders" in paths
    assert "/admin/pending-accounts" in paths
    assert "/admin/approve-account" in paths
    assert "/admin/reject-account" in paths

    assert "/chat" not in paths
    assert "/sos/events/opened" not in paths
