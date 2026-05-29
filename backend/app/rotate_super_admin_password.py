from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.super_admin import sync_super_admin


def main() -> None:
    settings = get_settings()
    db = SessionLocal()
    try:
        sync_super_admin(db, settings)
    finally:
        db.close()


if __name__ == "__main__":
    main()
