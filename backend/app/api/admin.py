from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.user import AccountStatus, User, UserRole
from app.models.privacy import AuditAction
from app.schemas.user import ModerationAccountRequest, PendingAccountResponse
from app.services.audit import write_audit_log

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/pending-accounts", response_model=list[PendingAccountResponse])
def pending_accounts(
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    db: Session = Depends(get_db),
) -> list[PendingAccountResponse]:
    users = (
        db.query(User)
        .filter(User.status == AccountStatus.PENDING_VERIFICATION)
        .order_by(User.created_at.asc())
        .all()
    )
    return [
        PendingAccountResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            status=user.status,
            created_at=user.created_at.isoformat(),
        )
        for user in users
    ]


@router.post("/approve-account")
def approve_account(
    payload: ModerationAccountRequest,
    admin: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = db.get(User, payload.user_id)
    if not user or user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    user.status = AccountStatus.ACTIVE
    write_audit_log(
        db,
        action=AuditAction.ACCOUNT_APPROVED,
        actor_user_id=admin.id,
        target_user_id=user.id,
        resource_type="user",
        resource_id=user.id,
        metadata={"role": user.role.value},
    )
    db.commit()
    return {"status": "approved"}


@router.post("/reject-account")
def reject_account(
    payload: ModerationAccountRequest,
    admin: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = db.get(User, payload.user_id)
    if not user or user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    user.status = AccountStatus.REJECTED
    write_audit_log(
        db,
        action=AuditAction.ACCOUNT_REJECTED,
        actor_user_id=admin.id,
        target_user_id=user.id,
        resource_type="user",
        resource_id=user.id,
        metadata={"role": user.role.value},
    )
    db.commit()
    return {"status": "rejected"}
