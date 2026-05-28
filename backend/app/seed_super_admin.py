from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import AccountStatus, User, UserRole


def main() -> None:
    settings = get_settings()
    if not settings.super_admin_password or settings.super_admin_password == "change-this-before-seeding":
        raise RuntimeError("Set SUPER_ADMIN_PASSWORD before running this seed")
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == settings.super_admin_email.lower()).first()
        if existing:
            return
        db.add(
            User(
                email=settings.super_admin_email.lower(),
                full_name="Bergmann Super Admin",
                password_hash=hash_password(settings.super_admin_password),
                role=UserRole.SUPER_ADMIN,
                status=AccountStatus.ACTIVE,
            )
        )
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
