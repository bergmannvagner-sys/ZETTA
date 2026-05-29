from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import hash_password
from app.models.user import AccountStatus, User, UserRole
from app.services.billing import default_plan_for_role, initial_subscription_status_for_role


def sync_super_admin(db: Session, settings: Settings) -> bool:
    if not settings.super_admin_password or settings.super_admin_password == "change-this-before-seeding":
        raise RuntimeError("Set SUPER_ADMIN_PASSWORD to a new strong secret before syncing super admin")

    email = settings.super_admin_email.lower()
    user = db.query(User).filter(User.email == email).first()
    changed = False
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
        changed = True
    else:
        user.password_hash = hash_password(settings.super_admin_password)
        user.role = UserRole.SUPER_ADMIN
        user.status = AccountStatus.ACTIVE
        user.subscription_plan = default_plan_for_role(UserRole.SUPER_ADMIN)
        user.subscription_status = initial_subscription_status_for_role(UserRole.SUPER_ADMIN)
        user.updated_at = datetime.now(UTC)
        changed = True
    db.commit()
    return changed
