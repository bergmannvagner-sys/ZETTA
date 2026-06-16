import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-with-more-than-thirty-two-chars")
os.environ.setdefault("DATA_ENCRYPTION_KEY", "test-data-encryption-key-with-more-than-thirty-two-chars")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:8081")
os.environ["APP_ENV"] = "test"

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_public_support_chat_uses_ai_contract(monkeypatch) -> None:
    async def fake_ask_support_bergmann(message: str, language: str | None = None, *, context_messages=None):
        assert message == "Erro no login do app"
        assert language == "pt-BR"
        assert context_messages == [{"sender": "USER", "content": "Antes tentei cadastrar"}]
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
    assert data["answer"] == "Verifique a URL do Render e o email de login."
    assert data["risk_level"] == "LOW"
    assert data["fallback"] is False
    assert data["in_scope"] is True
