import os

import pytest

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-with-more-than-thirty-two-chars")
os.environ.setdefault("DATA_ENCRYPTION_KEY", "test-data-encryption-key-with-more-than-thirty-two-chars")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:8081")
os.environ["APP_ENV"] = "test"

from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import engine
from app.main import app
from app.services.rate_limit import clear_rate_limits

Base.metadata.create_all(bind=engine)
client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    clear_rate_limits()
    yield
    clear_rate_limits()


def test_public_support_chat_uses_ai_contract(monkeypatch) -> None:
    seen_contexts: list[list[dict[str, str]]] = []

    async def fake_ask_support_bergmann(message: str, language: str | None = None, *, context_messages=None):
        seen_contexts.append(context_messages or [])
        assert message == "Erro no login do app"
        assert language == "pt-BR"
        return ("Verifique a URL do Render e o email de login.", "LOW", False, True)

    monkeypatch.setattr("app.api.support.ask_support_bergmann", fake_ask_support_bergmann)

    response = client.post(
        "/support/message",
        json={
            "message": "Erro no login do app",
            "language": "pt-BR",
            "context_messages": [{"sender": "USER", "content": "Antes tentei cadastrar"}],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] is None
    assert data["answer"] == "Verifique a URL do Render e o email de login."
    assert data["risk_level"] == "LOW"
    assert data["fallback"] is False
    assert data["in_scope"] is True
    assert seen_contexts == [[{"sender": "USER", "content": "Antes tentei cadastrar"}]]


def test_authenticated_support_chat_persists_history(monkeypatch) -> None:
    register = client.post(
        "/auth/register",
        json={
            "email": "support-user@example.com",
            "full_name": "Pessoa Suporte",
            "password": "strongpass123",
            "role": "USER",
            "document": "12345678909",
            "lgpdConsent": True,
        },
    )
    assert register.status_code == 201
    access_token = register.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    seen_contexts: list[list[dict[str, str]]] = []

    async def fake_ask_support_bergmann(message: str, language: str | None = None, *, context_messages=None):
        seen_contexts.append(context_messages or [])
        return (f"Resposta para {message}", "LOW", False, True)

    monkeypatch.setattr("app.api.support.ask_support_bergmann", fake_ask_support_bergmann)

    first = client.post(
        "/support/message",
        json={"message": "Nao consigo abrir o app", "language": "pt-BR"},
        headers=headers,
    )
    assert first.status_code == 200
    first_payload = first.json()
    assert first_payload["session_id"]
    assert first_payload["answer"] == "Resposta para Nao consigo abrir o app"

    second = client.post(
        "/support/message",
        json={"message": "A API do Render falhou", "language": "pt-BR"},
        headers=headers,
    )
    assert second.status_code == 200
    second_payload = second.json()
    assert second_payload["session_id"] == first_payload["session_id"]
    assert second_payload["answer"] == "Resposta para A API do Render falhou"

    history = client.get("/support/history", headers=headers)
    assert history.status_code == 200
    history_payload = history.json()
    assert history_payload["session_id"] == first_payload["session_id"]
    assert [message["sender"] for message in history_payload["messages"]] == ["USER", "BERGMANN", "USER", "BERGMANN"]
    assert history_payload["messages"][0]["content"] == "Nao consigo abrir o app"
    assert history_payload["messages"][2]["content"] == "A API do Render falhou"
    assert seen_contexts[0] == []
    assert seen_contexts[1] == [
        {"sender": "USER", "content": "Nao consigo abrir o app"},
        {"sender": "BERGMANN", "content": "Resposta para Nao consigo abrir o app"},
    ]
