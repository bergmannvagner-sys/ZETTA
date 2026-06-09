from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_lgpd_consent
from app.db.session import get_db
from app.models.user import AccountStatus, User, UserRole
from app.schemas.connections import ConnectionSearchResponse, MyConnectionCodeResponse
from app.services.billing import has_paid_access
from app.services.connection_codes import generate_connection_code, normalize_connection_code

router = APIRouter(prefix="/connections", tags=["connections"])

CONNECTABLE_ROLES = {
    UserRole.PSYCHOLOGIST,
    UserRole.COMPANY,
    UserRole.CLINIC,
    UserRole.HOSPITAL,
    UserRole.NGO,
    UserRole.PUBLIC_INSTITUTION,
}


def _serialize_target(user: User) -> ConnectionSearchResponse:
    return ConnectionSearchResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        status=user.status.value,
        connection_code=user.connection_code or "",
    )


@router.get("/me", response_model=MyConnectionCodeResponse)
def get_my_connection_code(
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> MyConnectionCodeResponse:
    if user.status != AccountStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account pending verification")
    if user.role not in CONNECTABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professional or institutional accounts can share connection code",
        )
    if not has_paid_access(user):
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Paid plan required")
    if not user.connection_code:
        user.connection_code = generate_connection_code(db)
        db.commit()
        db.refresh(user)
    return MyConnectionCodeResponse(connection_code=user.connection_code)


@router.get("/search", response_model=ConnectionSearchResponse)
def search_connection_target(
    user: Annotated[User, Depends(require_lgpd_consent)],
    query: Annotated[str, Query(min_length=3, max_length=320)],
    db: Session = Depends(get_db),
) -> ConnectionSearchResponse:
    if user.role != UserRole.USER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only common users can search connections")

    normalized_query = query.strip()
    if "@" in normalized_query:
        target = db.query(User).filter(User.email == normalized_query.lower()).first()
    else:
        target = db.query(User).filter(User.connection_code == normalize_connection_code(normalized_query)).first()

    if (
        not target
        or target.id == user.id
        or target.role not in CONNECTABLE_ROLES
        or target.status != AccountStatus.ACTIVE
        or not has_paid_access(target)
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active professional, company or institutional account not found",
        )
    if not target.connection_code:
        target.connection_code = generate_connection_code(db)
        db.commit()
        db.refresh(target)
    return _serialize_target(target)
