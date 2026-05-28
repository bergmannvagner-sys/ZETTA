import secrets
import string

from sqlalchemy.orm import Session

from app.models.user import User

ALPHABET = string.ascii_uppercase + string.digits


def normalize_connection_code(value: str) -> str:
    return "".join(char for char in value.upper() if char.isalnum())


def generate_connection_code(db: Session) -> str:
    for _ in range(20):
        code = f"BG{''.join(secrets.choice(ALPHABET) for _ in range(8))}"
        if not db.query(User).filter(User.connection_code == code).first():
            return code
    raise RuntimeError("Could not generate unique connection code")
