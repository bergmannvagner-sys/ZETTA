from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.user import AccountStatus, SubscriptionStatus, User, UserRole
from app.models.privacy import AuditAction
from app.schemas.user import ModerationAccountRequest, PendingAccountResponse
from app.services.audit import write_audit_log
from app.services.billing import approval_subscription_status_for_role
from app.services.verification import build_verification_triage

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/pending-accounts", response_model=list[PendingAccountResponse])
def pending_accounts(
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))],
    q: str | None = Query(default=None, max_length=120),
    role: UserRole | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[PendingAccountResponse]:
    query = db.query(User).filter(User.status == AccountStatus.PENDING_VERIFICATION)
    if role:
        query = query.filter(User.role == role)
    if q:
        like = f"%{q.strip().lower()}%"
        query = query.filter((User.email.ilike(like)) | (User.full_name.ilike(like)))
    users = query.order_by(User.created_at.asc()).all()
    responses: list[PendingAccountResponse] = []
    for user in users:
        triage = build_verification_triage(user)
        responses.append(
            PendingAccountResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=user.role,
                status=user.status,
                document_type=user.document_type,
                document_last4=user.document_last4,
                subscription_plan=user.subscription_plan,
                subscription_status=user.subscription_status,
                verification_score=triage.score,
                verification_recommendation=triage.recommendation,
                verification_signals=triage.signals,
                verification_warnings=triage.warnings,
                created_at=user.created_at.isoformat(),
            )
        )
    return responses


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
    user.subscription_status = approval_subscription_status_for_role(user.role)
    write_audit_log(
        db,
        action=AuditAction.ACCOUNT_APPROVED,
        actor_user_id=admin.id,
        target_user_id=user.id,
        resource_type="user",
        resource_id=user.id,
        metadata={
            "role": user.role.value,
            "reason": payload.reason,
            "subscription_plan": user.subscription_plan.value,
            "subscription_status": user.subscription_status.value,
        },
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
    user.subscription_status = SubscriptionStatus.CANCELED
    write_audit_log(
        db,
        action=AuditAction.ACCOUNT_REJECTED,
        actor_user_id=admin.id,
        target_user_id=user.id,
        resource_type="user",
        resource_id=user.id,
        metadata={"role": user.role.value, "reason": payload.reason},
    )
    db.commit()
    return {"status": "rejected"}
