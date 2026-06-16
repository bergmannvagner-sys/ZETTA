import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-with-more-than-thirty-two-chars")
os.environ.setdefault("DATA_ENCRYPTION_KEY", "test-data-encryption-key-with-more-than-thirty-two-chars")
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
    assert "/privacy/consent/revoke" in paths
    assert "/privacy/audit" in paths
    assert "/privacy/export" in paths
    assert "/privacy/account/archive" in paths
    assert "/chat/message" in paths
    assert "/chat/history" in paths
    assert "/chat/messages/{message_id}" in paths
    assert "/support/message" in paths
    assert "/support/history" in paths
    assert "/sos/event" in paths
    assert "/journal/entries" in paths
    assert "/emotions/logs" in paths
    assert "/sharing/consents" in paths
    assert "/reports/emotional/me" in paths
    assert "/professional/authorized-users" in paths
    assert "/professional/authorized-users/{owner_user_id}" in paths
    assert "/telecare/providers" in paths
    assert "/telecare/sessions" in paths
    assert "/telecare/sessions/{session_id}" in paths
    assert "/telecare/sessions/{session_id}/join" in paths
    assert "/telecare/sessions/{session_id}/status" in paths
    assert "/nr1/report" in paths
    assert "/nr1/workspace" in paths
    assert "/nr1/risks" in paths
    assert "/nr1/risks/{risk_id}" in paths
    assert "/nr1/actions" in paths
    assert "/nr1/actions/{action_id}" in paths
    assert "/nr1/trainings" in paths
    assert "/nr1/trainings/{training_id}" in paths
    assert "/institution/dashboard" in paths
    assert "/assistant/reminders" in paths
    assert "/connections/me" in paths
    assert "/connections/search" in paths
    assert "/admin/pending-accounts" in paths
    assert "/admin/moderated-accounts" in paths
    assert "/admin/subscriptions" in paths
    assert "/admin/billing-pending-accounts" in paths
    assert "/admin/billing-pending-alerts" in paths
    assert "/admin/billing-pending-alert-status" in paths
    assert "/admin/commercial-plans" in paths
    assert "/admin/billing-config" in paths
    assert "/admin/billing-webhooks" in paths
    assert "/admin/alerts" in paths
    assert "/admin/email-config" in paths
    assert "/admin/subscription-status" in paths
    assert "/admin/billing-reference" in paths
    assert "/admin/mercado-pago/checkout-preference" in paths
    assert "/admin/audit-logs" in paths
    assert "/admin/operations-summary" in paths
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
