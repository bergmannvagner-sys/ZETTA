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
from app.services.identity import validate_document
from app.services.rate_limit import clear_rate_limits

Base.metadata.create_all(bind=engine)
client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    clear_rate_limits()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    clear_rate_limits()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    clear_rate_limits()


def test_validate_document_rejects_invalid_cpf_cnpj_and_format() -> None:
    cpf_message = "Informe um CPF valido para validacao da conta."
    cnpj_message = "Informe um CNPJ valido para validacao da conta."

    assert validate_document("CPF", "11111111111") == cpf_message
    assert validate_document("CPF", "11144477734") == cpf_message
    assert validate_document("CPF", "123") == cpf_message

    assert validate_document("CNPJ", "11111111111111") == cnpj_message
    assert validate_document("CNPJ", "12345678000196") == cnpj_message
    assert validate_document("CNPJ", "12") == cnpj_message


def test_registration_blocks_duplicate_cpf_and_cnpj() -> None:
    cpf_register = client.post(
        "/auth/register",
        json={
            "email": "cpf-owner@example.com",
            "full_name": "Pessoa CPF",
            "password": "strongpass123",
            "role": "USER",
            "document": "11144477735",
            "lgpdConsent": True,
        },
    )
    assert cpf_register.status_code == 201

    cpf_duplicate = client.post(
        "/auth/register",
        json={
            "email": "cpf-copy@example.com",
            "full_name": "Pessoa CPF Copia",
            "password": "strongpass123",
            "role": "USER",
            "document": "111.444.777-35",
            "lgpdConsent": True,
        },
    )
    assert cpf_duplicate.status_code == 409
    assert cpf_duplicate.json()["detail"] == "Document already registered"

    cnpj_register = client.post(
        "/auth/register",
        json={
            "email": "company-owner@example.com",
            "full_name": "Empresa CNPJ",
            "password": "strongpass123",
            "role": "COMPANY",
            "document": "11222333000181",
            "lgpdConsent": True,
        },
    )
    assert cnpj_register.status_code == 201

    cnpj_duplicate = client.post(
        "/auth/register",
        json={
            "email": "company-copy@example.com",
            "full_name": "Empresa CNPJ Copia",
            "password": "strongpass123",
            "role": "COMPANY",
            "document": "11.222.333/0001-81",
            "lgpdConsent": True,
        },
    )
    assert cnpj_duplicate.status_code == 409
    assert cnpj_duplicate.json()["detail"] == "Document already registered"
