from datetime import UTC, datetime

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import AccountStatus, User, UserRole
from app.services.billing import default_plan_for_role, initial_subscription_status_for_role


def main() -> None:
    settings = get_settings()
    if not settings.super_admin_password or settings.super_admin_password == "change-this-before-seeding":
        raise RuntimeError("Set SUPER_ADMIN_PASSWORD to a new strong secret before rotating")

    email = settings.super_admin_email.lower()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                full_name="Bergmann Super Admin",
                role=UserRole.SUPER_ADMIN,
                status=AccountStatus.ACTIVE,
                subscription_plan=default_plan_for_role(UserRole.SUPER_ADMIN),
                subscription_status=initial_subscription_status_for_role(UserRole.SUPER_ADMIN),
                password_hash=hash_password(settings.super_admin_password),
            )
            db.add(user)
        else:
            user.password_hash = hash_password(settings.super_admin_password)
            user.role = UserRole.SUPER_ADMIN
            user.status = AccountStatus.ACTIVE
            user.subscription_plan = default_plan_for_role(UserRole.SUPER_ADMIN)
            user.subscription_status = initial_subscription_status_for_role(UserRole.SUPER_ADMIN)
            user.updated_at = datetime.now(UTC)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
