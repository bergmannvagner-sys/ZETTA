from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

from app.core.config import get_settings


def _derive_fernet_key(secret: str) -> bytes:
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def _encryption_secret() -> str:
    settings = get_settings()
    return settings.data_encryption_secret


def _fernet() -> Fernet:
    return Fernet(_derive_fernet_key(_encryption_secret()))


def encrypt_text(value: str | None) -> str | None:
    if value is None:
        return None
    token = _fernet().encrypt(value.encode("utf-8"))
    return token.decode("ascii")


def decrypt_text(value: str | None) -> str | None:
    if value is None:
        return None
    try:
        plaintext = _fernet().decrypt(value.encode("ascii"))
    except (InvalidToken, ValueError, TypeError, UnicodeDecodeError):
        return value
    return plaintext.decode("utf-8")


class EncryptedText(TypeDecorator[str]):
    impl = Text
    cache_ok = True

    def process_bind_param(self, value: str | None, _dialect) -> str | None:
        return encrypt_text(value)

    def process_result_value(self, value: str | None, _dialect) -> str | None:
        return decrypt_text(value)
