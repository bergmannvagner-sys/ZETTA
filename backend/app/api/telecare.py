from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_lgpd_consent
from app.core.config import get_settings
from app.db.session import get_db
from app.models.privacy import AuditAction
from app.models.telecare import TelecareSession
from app.models.user import AccountStatus, User, UserRole
from app.schemas.telecare import (
    TelecareJoinResponse,
    TelecareProviderResponse,
    TelecareSessionCreate,
    TelecareSessionResponse,
    TelecareSessionStatusUpdate,
)
from app.services.audit import write_audit_log
from app.services.billing import has_paid_access
from app.services.telecare import (
    DailyTelecareError,
    cents_to_brl,
    create_daily_join,
    create_daily_room,
    daily_video_status_for_session,
    new_room_code,
    platform_fee_cents_for_price,
    platform_fee_percent,
    provider_payout_cents_for_price,
    role_accepts_telecare,
    session_price_cents_for_provider,
)

router = APIRouter(prefix="/telecare", tags=["telecare"])

PROVIDER_ALLOWED_STATUSES = {"ACCEPTED", "IN_SESSION", "COMPLETED", "CANCELED"}
PUBLIC_TELECARE_PROVIDER_ROLES = {role for role in UserRole if role_accepts_telecare(role)}


def serialize_provider(provider: User) -> TelecareProviderResponse:
    price_cents = session_price_cents_for_provider(provider)
    platform_fee_cents = platform_fee_cents_for_price(price_cents)
    return TelecareProviderResponse(
        id=provider.id,
        full_name=provider.full_name,
        role=provider.role.value,
        session_price_brl=cents_to_brl(price_cents),
        platform_fee_percent=platform_fee_percent(),
        platform_fee_brl=cents_to_brl(platform_fee_cents),
        provider_payout_brl=cents_to_brl(provider_payout_cents_for_price(price_cents)),
        accepts_telecare=True,
    )


def serialize_session(session: TelecareSession) -> TelecareSessionResponse:
    settings = get_settings()
    return TelecareSessionResponse(
        id=session.id,
        requester_user_id=session.requester_user_id,
        requester_name=session.requester.full_name,
        provider_user_id=session.provider_user_id,
        provider_name=session.provider.full_name,
        provider_role=session.provider_role,
        status=session.status,
        room_code=session.room_code,
        session_price_brl=cents_to_brl(session.session_price_cents),
        platform_fee_percent=platform_fee_percent(),
        platform_fee_brl=cents_to_brl(session.platform_fee_cents),
        provider_payout_brl=cents_to_brl(session.provider_payout_cents),
        payment_status=session.payment_status,
        notes=session.notes,
        requested_at=session.requested_at,
        scheduled_for=session.scheduled_for,
        updated_at=session.updated_at,
        video_engine_status=daily_video_status_for_session(session, settings),
    )


def get_visible_session(db: Session, session_id: str, user: User) -> TelecareSession:
    session = db.get(TelecareSession, session_id)
    if not session or user.id not in {session.requester_user_id, session.provider_user_id}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Telecare session not found")
    return session


def ensure_daily_room(session: TelecareSession) -> None:
    settings = get_settings()
    if session.daily_room_url or not settings.daily_configured:
        return
    try:
        room = create_daily_room(session, settings)
    except DailyTelecareError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    session.daily_room_name = room.name
    session.daily_room_url = room.url
    session.daily_room_created_at = datetime.now(UTC)


@router.get("/providers", response_model=list[TelecareProviderResponse])
def list_telecare_providers(
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> list[TelecareProviderResponse]:
    providers = (
        db.query(User)
        .filter(User.status == AccountStatus.ACTIVE, User.role.in_(PUBLIC_TELECARE_PROVIDER_ROLES))
        .order_by(User.full_name.asc())
        .limit(80)
        .all()
    )
    return [serialize_provider(provider) for provider in providers if provider.id != user.id and has_paid_access(provider)]


@router.post("/sessions", response_model=TelecareSessionResponse, status_code=status.HTTP_201_CREATED)
def request_telecare_session(
    payload: TelecareSessionCreate,
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> TelecareSessionResponse:
    if user.role != UserRole.USER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only common users can request telecare")

    provider = db.get(User, payload.provider_user_id)
    if (
        not provider
        or provider.status != AccountStatus.ACTIVE
        or provider.role not in PUBLIC_TELECARE_PROVIDER_ROLES
        or not has_paid_access(provider)
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Telecare provider not found")

    price_cents = session_price_cents_for_provider(provider)
    platform_fee_cents = platform_fee_cents_for_price(price_cents)
    session = TelecareSession(
        requester_user_id=user.id,
        provider_user_id=provider.id,
        provider_role=provider.role.value,
        room_code=new_room_code(),
        session_price_cents=price_cents,
        platform_fee_bps=2000,
        platform_fee_cents=platform_fee_cents,
        provider_payout_cents=provider_payout_cents_for_price(price_cents),
        notes=payload.notes.strip() if payload.notes else None,
        scheduled_for=payload.scheduled_for,
    )
    db.add(session)
    write_audit_log(
        db,
        action=AuditAction.TELECARE_SESSION_REQUESTED,
        actor_user_id=user.id,
        target_user_id=provider.id,
        resource_type="telecare_session",
        resource_id=session.id,
        metadata={
            "provider_role": provider.role.value,
            "session_price_cents": price_cents,
            "platform_fee_cents": platform_fee_cents,
            "provider_payout_cents": session.provider_payout_cents,
        },
    )
    db.commit()
    db.refresh(session)
    return serialize_session(session)


@router.get("/sessions", response_model=list[TelecareSessionResponse])
def list_telecare_sessions(
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> list[TelecareSessionResponse]:
    query = db.query(TelecareSession)
    if user.role == UserRole.USER:
        query = query.filter(TelecareSession.requester_user_id == user.id)
    elif role_accepts_telecare(user.role) and has_paid_access(user):
        query = query.filter(TelecareSession.provider_user_id == user.id)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission")
    sessions = query.order_by(TelecareSession.requested_at.desc()).limit(50).all()
    return [serialize_session(session) for session in sessions]


@router.get("/sessions/{session_id}", response_model=TelecareSessionResponse)
def get_telecare_session(
    session_id: str,
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> TelecareSessionResponse:
    return serialize_session(get_visible_session(db, session_id, user))


@router.post("/sessions/{session_id}/join", response_model=TelecareJoinResponse)
def join_telecare_session(
    session_id: str,
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> TelecareJoinResponse:
    session = get_visible_session(db, session_id, user)
    if session.status not in {"ACCEPTED", "IN_SESSION"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Telecare room is available only after provider accepts the request",
        )

    settings = get_settings()
    if not settings.daily_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Daily is not configured. Set DAILY_API_KEY in the backend environment.",
        )

    ensure_daily_room(session)
    db.commit()
    db.refresh(session)

    try:
        daily_join = create_daily_join(
            session,
            user,
            settings,
            owner=user.id == session.provider_user_id,
        )
    except DailyTelecareError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return TelecareJoinResponse(
        session_id=session.id,
        room_code=session.room_code,
        provider_name=session.provider.full_name,
        requester_name=session.requester.full_name,
        join_url=daily_join.join_url,
        expires_at=daily_join.expires_at,
    )


@router.patch("/sessions/{session_id}/status", response_model=TelecareSessionResponse)
def update_telecare_session_status(
    session_id: str,
    payload: TelecareSessionStatusUpdate,
    user: Annotated[User, Depends(require_lgpd_consent)],
    db: Session = Depends(get_db),
) -> TelecareSessionResponse:
    session = get_visible_session(db, session_id, user)
    now = datetime.now(UTC)
    if user.id == session.requester_user_id:
        if payload.status != "CANCELED":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only provider can change telecare status")
        session.canceled_at = now
    elif user.id == session.provider_user_id:
        if payload.status not in PROVIDER_ALLOWED_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid telecare status")
        if payload.status == "ACCEPTED":
            ensure_daily_room(session)
            session.accepted_at = now
        elif payload.status == "IN_SESSION":
            ensure_daily_room(session)
            session.started_at = now
        elif payload.status == "COMPLETED":
            session.completed_at = now
            session.payment_status = "PENDING_PROVIDER_REPASS"
        elif payload.status == "CANCELED":
            session.canceled_at = now
    session.status = payload.status

    write_audit_log(
        db,
        action=AuditAction.TELECARE_SESSION_STATUS_UPDATED,
        actor_user_id=user.id,
        target_user_id=session.provider_user_id,
        resource_type="telecare_session",
        resource_id=session.id,
        metadata={
            "status": session.status,
            "payment_status": session.payment_status,
            "platform_fee_cents": session.platform_fee_cents,
            "provider_payout_cents": session.provider_payout_cents,
        },
    )
    db.commit()
    db.refresh(session)
    return serialize_session(session)
