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
    assert "/billing/webhook" in paths
    assert "/billing/mercado-pago/webhook" in paths
    assert "/billing/success" in paths
    assert "/billing/pending" in paths
    assert "/billing/failure" in paths
    assert "/users/me" in paths
    assert "/privacy/consent" in paths
    assert "/chat/message" in paths
    assert "/sos/event" in paths
    assert "/journal/entries" in paths
    assert "/emotions/logs" in paths
    assert "/sharing/consents" in paths
    assert "/reports/emotional/me" in paths
    assert "/professional/authorized-users" in paths
    assert "/professional/authorized-users/{owner_user_id}" in paths
    assert "/nr1/report" in paths
    assert "/assistant/reminders" in paths
    assert "/connections/me" in paths
    assert "/connections/search" in paths
    assert "/admin/pending-accounts" in paths
    assert "/admin/moderated-accounts" in paths
    assert "/admin/subscriptions" in paths
    assert "/admin/commercial-plans" in paths
    assert "/admin/billing-config" in paths
    assert "/admin/email-config" in paths
    assert "/admin/subscription-status" in paths
    assert "/admin/billing-reference" in paths
    assert "/admin/mercado-pago/checkout-preference" in paths
    assert "/admin/audit-logs" in paths
    assert "/admin/approve-account" in paths
    assert "/admin/reject-account" in paths
    assert "/admin/archive-account" in paths

    assert "/chat" not in paths
    assert "/sos/events/opened" not in paths


def test_billing_return_pages_do_not_claim_webhook_confirmation() -> None:
    for path in ["/billing/success", "/billing/pending", "/billing/failure"]:
        response = client.get(path)
        assert response.status_code == 200
        assert "ZETTA BERGMANN" in response.text
        assert "webhook" in response.text.lower()
