from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_lgpd_consent
from app.db.session import get_db
from app.models.nr1 import NR1ActionItem, NR1RiskItem, NR1TrainingItem, NR1Workspace
from app.models.privacy import AuditAction
from app.models.user import User, UserRole
from app.schemas.nr1 import (
    NR1ActionItemCreate,
    NR1ActionItemUpdate,
    NR1RiskItemCreate,
    NR1RiskItemUpdate,
    NR1TrainingItemCreate,
    NR1TrainingItemUpdate,
    NR1WorkspaceOverviewResponse,
    NR1WorkspaceUpdate,
)
from app.services.nr1 import (
    build_nr1_workspace_overview,
    create_nr1_action,
    create_nr1_risk,
    create_nr1_training,
    delete_nr1_action,
    delete_nr1_risk,
    delete_nr1_training,
    ensure_nr1_workspace,
    record_nr1_audit,
    update_nr1_action,
    update_nr1_risk,
    update_nr1_training,
    update_nr1_workspace,
)
from app.services.billing import has_paid_access

router = APIRouter(prefix="/nr1", tags=["nr1"])


def require_nr1_company(user: Annotated[User, Depends(require_lgpd_consent)]) -> User:
    if user.role != UserRole.COMPANY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only company accounts can access NR-1")
    if not has_paid_access(user):
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Paid plan required")
    return user


def _get_workspace(db: Session, user: User) -> NR1Workspace:
    return ensure_nr1_workspace(db, user)


def _get_risk_or_404(db: Session, risk_id: str, workspace: NR1Workspace) -> NR1RiskItem:
    risk = db.get(NR1RiskItem, risk_id)
    if not risk or risk.workspace_id != workspace.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk item not found")
    return risk


def _get_action_or_404(db: Session, action_id: str, workspace: NR1Workspace) -> NR1ActionItem:
    action = db.get(NR1ActionItem, action_id)
    if not action or action.workspace_id != workspace.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action item not found")
    return action


def _get_training_or_404(db: Session, training_id: str, workspace: NR1Workspace) -> NR1TrainingItem:
    training = db.get(NR1TrainingItem, training_id)
    if not training or training.workspace_id != workspace.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training item not found")
    return training


@router.get("/workspace", response_model=NR1WorkspaceOverviewResponse)
def get_nr1_workspace(
    user: Annotated[User, Depends(require_nr1_company)],
    db: Session = Depends(get_db),
) -> NR1WorkspaceOverviewResponse:
    workspace = _get_workspace(db, user)
    record_nr1_audit(
        db,
        actor_user_id=user.id,
        resource_type="nr1_workspace",
        resource_id=workspace.id,
        target_user_id=user.id,
        action=AuditAction.NR1_REPORT_VIEWED,
        metadata={"workspace_status": workspace.status},
    )
    db.commit()
    return build_nr1_workspace_overview(db, user)


@router.patch("/workspace", response_model=NR1WorkspaceOverviewResponse)
def patch_nr1_workspace(
    payload: NR1WorkspaceUpdate,
    user: Annotated[User, Depends(require_nr1_company)],
    db: Session = Depends(get_db),
) -> NR1WorkspaceOverviewResponse:
    workspace = _get_workspace(db, user)
    update_nr1_workspace(db, workspace, payload)
    record_nr1_audit(
        db,
        actor_user_id=user.id,
        resource_type="nr1_workspace",
        resource_id=workspace.id,
        target_user_id=user.id,
        metadata={"workspace_status": workspace.status},
    )
    db.commit()
    return build_nr1_workspace_overview(db, user)


@router.post("/risks", response_model=NR1WorkspaceOverviewResponse, status_code=status.HTTP_201_CREATED)
def create_nr1_risk_item(
    payload: NR1RiskItemCreate,
    user: Annotated[User, Depends(require_nr1_company)],
    db: Session = Depends(get_db),
) -> NR1WorkspaceOverviewResponse:
    workspace = _get_workspace(db, user)
    risk = create_nr1_risk(db, workspace, payload)
    record_nr1_audit(
        db,
        actor_user_id=user.id,
        resource_type="nr1_risk_item",
        resource_id=risk.id,
        target_user_id=user.id,
        metadata={"risk_score": risk.severity * risk.likelihood, "category": risk.category},
    )
    db.commit()
    return build_nr1_workspace_overview(db, user)


@router.patch("/risks/{risk_id}", response_model=NR1WorkspaceOverviewResponse)
def patch_nr1_risk_item(
    risk_id: str,
    payload: NR1RiskItemUpdate,
    user: Annotated[User, Depends(require_nr1_company)],
    db: Session = Depends(get_db),
) -> NR1WorkspaceOverviewResponse:
    workspace = _get_workspace(db, user)
    risk = _get_risk_or_404(db, risk_id, workspace)
    try:
        update_nr1_risk(db, workspace, risk, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    record_nr1_audit(
        db,
        actor_user_id=user.id,
        resource_type="nr1_risk_item",
        resource_id=risk.id,
        target_user_id=user.id,
        metadata={"risk_score": risk.severity * risk.likelihood, "status": risk.status},
    )
    db.commit()
    return build_nr1_workspace_overview(db, user)


@router.delete("/risks/{risk_id}", response_model=NR1WorkspaceOverviewResponse)
def delete_nr1_risk_item(
    risk_id: str,
    user: Annotated[User, Depends(require_nr1_company)],
    db: Session = Depends(get_db),
) -> NR1WorkspaceOverviewResponse:
    workspace = _get_workspace(db, user)
    risk = _get_risk_or_404(db, risk_id, workspace)
    delete_nr1_risk(db, workspace, risk)
    record_nr1_audit(
        db,
        actor_user_id=user.id,
        resource_type="nr1_risk_item",
        resource_id=risk.id,
        target_user_id=user.id,
        metadata={"deleted": True},
    )
    db.commit()
    return build_nr1_workspace_overview(db, user)


@router.post("/actions", response_model=NR1WorkspaceOverviewResponse, status_code=status.HTTP_201_CREATED)
def create_nr1_action_item(
    payload: NR1ActionItemCreate,
    user: Annotated[User, Depends(require_nr1_company)],
    db: Session = Depends(get_db),
) -> NR1WorkspaceOverviewResponse:
    workspace = _get_workspace(db, user)
    try:
        action = create_nr1_action(db, workspace, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    record_nr1_audit(
        db,
        actor_user_id=user.id,
        resource_type="nr1_action_item",
        resource_id=action.id,
        target_user_id=user.id,
        metadata={"status": action.status, "progress_percent": action.progress_percent},
    )
    db.commit()
    return build_nr1_workspace_overview(db, user)


@router.patch("/actions/{action_id}", response_model=NR1WorkspaceOverviewResponse)
def patch_nr1_action_item(
    action_id: str,
    payload: NR1ActionItemUpdate,
    user: Annotated[User, Depends(require_nr1_company)],
    db: Session = Depends(get_db),
) -> NR1WorkspaceOverviewResponse:
    workspace = _get_workspace(db, user)
    action = _get_action_or_404(db, action_id, workspace)
    try:
        update_nr1_action(db, workspace, action, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    record_nr1_audit(
        db,
        actor_user_id=user.id,
        resource_type="nr1_action_item",
        resource_id=action.id,
        target_user_id=user.id,
        metadata={"status": action.status, "progress_percent": action.progress_percent},
    )
    db.commit()
    return build_nr1_workspace_overview(db, user)


@router.delete("/actions/{action_id}", response_model=NR1WorkspaceOverviewResponse)
def delete_nr1_action_item(
    action_id: str,
    user: Annotated[User, Depends(require_nr1_company)],
    db: Session = Depends(get_db),
) -> NR1WorkspaceOverviewResponse:
    workspace = _get_workspace(db, user)
    action = _get_action_or_404(db, action_id, workspace)
    delete_nr1_action(db, workspace, action)
    record_nr1_audit(
        db,
        actor_user_id=user.id,
        resource_type="nr1_action_item",
        resource_id=action.id,
        target_user_id=user.id,
        metadata={"deleted": True},
    )
    db.commit()
    return build_nr1_workspace_overview(db, user)


@router.post("/trainings", response_model=NR1WorkspaceOverviewResponse, status_code=status.HTTP_201_CREATED)
def create_nr1_training_item(
    payload: NR1TrainingItemCreate,
    user: Annotated[User, Depends(require_nr1_company)],
    db: Session = Depends(get_db),
) -> NR1WorkspaceOverviewResponse:
    workspace = _get_workspace(db, user)
    training = create_nr1_training(db, workspace, payload)
    record_nr1_audit(
        db,
        actor_user_id=user.id,
        resource_type="nr1_training_item",
        resource_id=training.id,
        target_user_id=user.id,
        metadata={"status": training.status, "due_on": str(training.due_on) if training.due_on else None},
    )
    db.commit()
    return build_nr1_workspace_overview(db, user)


@router.patch("/trainings/{training_id}", response_model=NR1WorkspaceOverviewResponse)
def patch_nr1_training_item(
    training_id: str,
    payload: NR1TrainingItemUpdate,
    user: Annotated[User, Depends(require_nr1_company)],
    db: Session = Depends(get_db),
) -> NR1WorkspaceOverviewResponse:
    workspace = _get_workspace(db, user)
    training = _get_training_or_404(db, training_id, workspace)
    update_nr1_training(db, workspace, training, payload)
    record_nr1_audit(
        db,
        actor_user_id=user.id,
        resource_type="nr1_training_item",
        resource_id=training.id,
        target_user_id=user.id,
        metadata={"status": training.status, "due_on": str(training.due_on) if training.due_on else None},
    )
    db.commit()
    return build_nr1_workspace_overview(db, user)


@router.delete("/trainings/{training_id}", response_model=NR1WorkspaceOverviewResponse)
def delete_nr1_training_item(
    training_id: str,
    user: Annotated[User, Depends(require_nr1_company)],
    db: Session = Depends(get_db),
) -> NR1WorkspaceOverviewResponse:
    workspace = _get_workspace(db, user)
    training = _get_training_or_404(db, training_id, workspace)
    delete_nr1_training(db, workspace, training)
    record_nr1_audit(
        db,
        actor_user_id=user.id,
        resource_type="nr1_training_item",
        resource_id=training.id,
        target_user_id=user.id,
        metadata={"deleted": True},
    )
    db.commit()
    return build_nr1_workspace_overview(db, user)
