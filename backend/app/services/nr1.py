from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from statistics import mean

from sqlalchemy.orm import Session

from app.models.emotional import EmotionLog, SharingCategory, UserSharingConsent
from app.models.nr1 import (
    NR1ActionItem,
    NR1ActionStatus,
    NR1RiskCategory,
    NR1RiskItem,
    NR1RiskSource,
    NR1RiskStatus,
    NR1TrainingItem,
    NR1TrainingStatus,
    NR1Workspace,
    NR1WorkspaceStatus,
)
from app.models.user import User, UserRole
from app.schemas.nr1 import (
    NR1ActionItemCreate,
    NR1ActionItemResponse,
    NR1ActionItemUpdate,
    NR1RiskItemCreate,
    NR1RiskItemResponse,
    NR1RiskItemUpdate,
    NR1SummaryResponse,
    NR1TrainingItemCreate,
    NR1TrainingItemResponse,
    NR1TrainingItemUpdate,
    NR1WorkspaceOverviewResponse,
    NR1WorkspaceResponse,
    NR1WorkspaceUpdate,
)
from app.services.audit import write_audit_log
from app.models.privacy import AuditAction

NR1_MIN_PARTICIPANTS = 3
NR1_DEFAULT_SCOPE = (
    "Estruturar PGR/GRO com foco em riscos psicossociais, comunicacao, carga de trabalho, pausas e apoio humano."
)
NR1_PRIVACY_NOTE = "Amostras individuais nunca sao exibidas; somente indicadores agregados e itens operacionais do workspace."


@dataclass(frozen=True)
class _RiskTemplate:
    title: str
    description: str
    category: NR1RiskCategory
    severity: int
    likelihood: int
    owner_label: str
    status: NR1RiskStatus
    due_days: int


@dataclass(frozen=True)
class _ActionTemplate:
    title: str
    description: str
    owner_label: str
    status: NR1ActionStatus
    progress_percent: int
    due_days: int
    risk_index: int | None


@dataclass(frozen=True)
class _TrainingTemplate:
    title: str
    audience: str
    status: NR1TrainingStatus
    frequency_days: int
    required_hours: float
    due_days: int


RISK_TEMPLATES: tuple[_RiskTemplate, ...] = (
    _RiskTemplate(
        title="Sobrecarga de trabalho e prazos comprimidos",
        description="Revisar distribuicao de demanda, capacidade real e volume de horas extras.",
        category=NR1RiskCategory.PSYCHOSOCIAL,
        severity=4,
        likelihood=4,
        owner_label="Gestao e RH",
        status=NR1RiskStatus.OPEN,
        due_days=30,
    ),
    _RiskTemplate(
        title="Assedio moral ou comunicacao agressiva",
        description="Garantir canal seguro de relato, apuracao e protecao contra retaliação.",
        category=NR1RiskCategory.PSYCHOSOCIAL,
        severity=5,
        likelihood=3,
        owner_label="Lideranca",
        status=NR1RiskStatus.OPEN,
        due_days=14,
    ),
    _RiskTemplate(
        title="Ambiguidade de funcao e prioridades",
        description="Clarificar papes, fluxos de decisao e o que deve ser interrompido antes de sobrecarga.",
        category=NR1RiskCategory.ORGANIZATIONAL,
        severity=3,
        likelihood=4,
        owner_label="Operacao",
        status=NR1RiskStatus.MITIGATING,
        due_days=21,
    ),
    _RiskTemplate(
        title="Falta de pausas, recuperacao e suporte",
        description="Mapear pausas, rotina de descanso e riscos de fadiga prolongada.",
        category=NR1RiskCategory.ERGONOMIC,
        severity=4,
        likelihood=4,
        owner_label="Operacao",
        status=NR1RiskStatus.OPEN,
        due_days=21,
    ),
)

ACTION_TEMPLATES: tuple[_ActionTemplate, ...] = (
    _ActionTemplate(
        title="Mapear fatores de risco com liderancas",
        description="Reuniao inicial para validar fatores prioritarios do PGR/GRO.",
        owner_label="RH e Diretoria",
        status=NR1ActionStatus.PLANNED,
        progress_percent=0,
        due_days=7,
        risk_index=0,
    ),
    _ActionTemplate(
        title="Formalizar canal de relato seguro",
        description="Definir fluxo sem retaliação para queixas de assedio e sobrecarga.",
        owner_label="Compliance",
        status=NR1ActionStatus.IN_PROGRESS,
        progress_percent=35,
        due_days=10,
        risk_index=1,
    ),
    _ActionTemplate(
        title="Revisar dimensionamento e pausas",
        description="Ajustar rotina, escala e pausas para reduzir fadiga acumulada.",
        owner_label="Operacao",
        status=NR1ActionStatus.PLANNED,
        progress_percent=10,
        due_days=14,
        risk_index=3,
    ),
    _ActionTemplate(
        title="Treinar liderancas em risco psicossocial",
        description="Capacitar gestores em prevencao de assedio, escuta e escalonamento de crise.",
        owner_label="People Ops",
        status=NR1ActionStatus.PLANNED,
        progress_percent=0,
        due_days=21,
        risk_index=1,
    ),
)

TRAINING_TEMPLATES: tuple[_TrainingTemplate, ...] = (
    _TrainingTemplate(
        title="Introducao ao GRO e ao PGR",
        audience="Liderancas e RH",
        status=NR1TrainingStatus.SCHEDULED,
        frequency_days=180,
        required_hours=2,
        due_days=30,
    ),
    _TrainingTemplate(
        title="Prevencao de riscos psicossociais",
        audience="Gestores e multiplicadores",
        status=NR1TrainingStatus.PENDING,
        frequency_days=120,
        required_hours=2,
        due_days=21,
    ),
    _TrainingTemplate(
        title="Canal de relato e antiassedio",
        audience="Toda a lideranca",
        status=NR1TrainingStatus.PENDING,
        frequency_days=120,
        required_hours=1.5,
        due_days=14,
    ),
)


def _days_from_now(days: int) -> date:
    return (datetime.now(UTC) + timedelta(days=days)).date()


def _safe_average(values: list[int | float | None]) -> float | None:
    clean_values = [value for value in values if value is not None]
    return round(mean(clean_values), 2) if clean_values else None


def _json_list(value: str | None) -> list[str]:
    if not value:
        return []
    data = json.loads(value)
    return data if isinstance(data, list) else []


def _categories(consent: UserSharingConsent) -> list[SharingCategory]:
    return [SharingCategory(category) for category in _json_list(consent.categories_json)]


def _has_nr1_signal_access(consent: UserSharingConsent) -> bool:
    category_set = set(_categories(consent))
    return bool(category_set & {SharingCategory.MOOD, SharingCategory.TRENDS, SharingCategory.CRISIS})


def _workspace_query(db: Session, company_user_id: str) -> NR1Workspace | None:
    return db.query(NR1Workspace).filter(NR1Workspace.company_user_id == company_user_id).first()


def _seed_workspace_templates(db: Session, workspace: NR1Workspace) -> None:
    existing_risk_count = db.query(NR1RiskItem).filter(NR1RiskItem.workspace_id == workspace.id).count()
    if existing_risk_count > 0:
        return

    created_risks: list[NR1RiskItem] = []
    for template in RISK_TEMPLATES:
        risk = NR1RiskItem(
            workspace_id=workspace.id,
            title=template.title,
            description=template.description,
            category=template.category.value,
            source=NR1RiskSource.TEMPLATE.value,
            status=template.status.value,
            severity=template.severity,
            likelihood=template.likelihood,
            owner_label=template.owner_label,
            due_on=_days_from_now(template.due_days),
            is_template=True,
        )
        db.add(risk)
        created_risks.append(risk)
    db.flush()

    for template in ACTION_TEMPLATES:
        risk_item_id = None
        if template.risk_index is not None and template.risk_index < len(created_risks):
            risk_item_id = created_risks[template.risk_index].id
        action = NR1ActionItem(
            workspace_id=workspace.id,
            risk_item_id=risk_item_id,
            title=template.title,
            description=template.description,
            owner_label=template.owner_label,
            status=template.status.value,
            progress_percent=template.progress_percent,
            due_on=_days_from_now(template.due_days),
            is_template=True,
        )
        db.add(action)

    for template in TRAINING_TEMPLATES:
        training = NR1TrainingItem(
            workspace_id=workspace.id,
            title=template.title,
            audience=template.audience,
            status=template.status.value,
            frequency_days=template.frequency_days,
            required_hours=template.required_hours,
            due_on=_days_from_now(template.due_days),
            is_template=True,
        )
        db.add(training)

    workspace.status = NR1WorkspaceStatus.DRAFT.value
    workspace.last_reviewed_at = datetime.now(UTC)


def ensure_nr1_workspace(db: Session, company: User) -> NR1Workspace:
    workspace = _workspace_query(db, company.id)
    if workspace is None:
        workspace = NR1Workspace(
            company_user_id=company.id,
            organization_name=company.full_name,
            unit_name="Unidade principal",
            gro_owner_name=company.full_name,
            scope_statement=NR1_DEFAULT_SCOPE,
            notes="Modelo inicial criado pelo Bergmann para estruturar PGR/GRO com transparencia.",
            status=NR1WorkspaceStatus.DRAFT.value,
        )
        db.add(workspace)
        db.flush()
        _seed_workspace_templates(db, workspace)
        db.flush()
        return workspace

    _seed_workspace_templates(db, workspace)
    db.flush()
    return workspace


def _collect_participant_ids(db: Session, company: User) -> list[str]:
    consents = (
        db.query(UserSharingConsent)
        .filter(
            UserSharingConsent.target_user_id == company.id,
            UserSharingConsent.revoked_at.is_(None),
        )
        .all()
    )
    participant_ids: list[str] = []
    for consent in consents:
        if _has_nr1_signal_access(consent) and consent.owner_user_id not in participant_ids:
            participant_ids.append(consent.owner_user_id)
    return participant_ids


def _collect_nr1_logs(db: Session, participant_ids: list[str]) -> list[EmotionLog]:
    logs: list[EmotionLog] = []
    for owner_id in participant_ids:
        logs.extend(
            db.query(EmotionLog)
            .filter(EmotionLog.user_id == owner_id)
            .order_by(EmotionLog.created_at.desc())
            .limit(20)
            .all()
        )
    logs.sort(key=lambda log: log.created_at, reverse=True)
    return logs


def _risk_score(severity: int, likelihood: int) -> int:
    return severity * likelihood


def _is_action_overdue(action: NR1ActionItem) -> bool:
    return bool(action.due_on and action.due_on < datetime.now(UTC).date() and action.status != NR1ActionStatus.COMPLETED.value)


def _is_training_overdue(training: NR1TrainingItem) -> bool:
    return bool(
        training.due_on and training.due_on < datetime.now(UTC).date() and training.status != NR1TrainingStatus.COMPLETED.value
    )


def _serialize_workspace(workspace: NR1Workspace) -> NR1WorkspaceResponse:
    return NR1WorkspaceResponse(
        id=workspace.id,
        company_user_id=workspace.company_user_id,
        organization_name=workspace.organization_name,
        unit_name=workspace.unit_name,
        gro_owner_name=workspace.gro_owner_name,
        scope_statement=workspace.scope_statement,
        notes=workspace.notes,
        status=NR1WorkspaceStatus(workspace.status),
        last_reviewed_at=workspace.last_reviewed_at,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at,
    )


def _serialize_risk(risk: NR1RiskItem) -> NR1RiskItemResponse:
    return NR1RiskItemResponse(
        id=risk.id,
        workspace_id=risk.workspace_id,
        title=risk.title,
        description=risk.description,
        category=NR1RiskCategory(risk.category),
        source=NR1RiskSource(risk.source),
        status=NR1RiskStatus(risk.status),
        severity=risk.severity,
        likelihood=risk.likelihood,
        risk_score=_risk_score(risk.severity, risk.likelihood),
        owner_label=risk.owner_label,
        due_on=risk.due_on,
        notes=risk.notes,
        is_template=risk.is_template,
        reviewed_at=risk.reviewed_at,
        created_at=risk.created_at,
        updated_at=risk.updated_at,
    )


def _serialize_action(action: NR1ActionItem) -> NR1ActionItemResponse:
    return NR1ActionItemResponse(
        id=action.id,
        workspace_id=action.workspace_id,
        risk_item_id=action.risk_item_id,
        title=action.title,
        description=action.description,
        owner_label=action.owner_label,
        status=NR1ActionStatus(action.status),
        progress_percent=action.progress_percent,
        due_on=action.due_on,
        completed_on=action.completed_on,
        notes=action.notes,
        is_template=action.is_template,
        is_overdue=_is_action_overdue(action),
        created_at=action.created_at,
        updated_at=action.updated_at,
    )


def _serialize_training(training: NR1TrainingItem) -> NR1TrainingItemResponse:
    return NR1TrainingItemResponse(
        id=training.id,
        workspace_id=training.workspace_id,
        title=training.title,
        audience=training.audience,
        status=NR1TrainingStatus(training.status),
        frequency_days=training.frequency_days,
        required_hours=float(training.required_hours) if training.required_hours is not None else None,
        due_on=training.due_on,
        completed_on=training.completed_on,
        notes=training.notes,
        is_template=training.is_template,
        is_overdue=_is_training_overdue(training),
        created_at=training.created_at,
        updated_at=training.updated_at,
    )


def _workspace_items(db: Session, workspace: NR1Workspace) -> tuple[list[NR1RiskItem], list[NR1ActionItem], list[NR1TrainingItem]]:
    risks = db.query(NR1RiskItem).filter(NR1RiskItem.workspace_id == workspace.id).order_by(NR1RiskItem.created_at.desc()).all()
    actions = (
        db.query(NR1ActionItem).filter(NR1ActionItem.workspace_id == workspace.id).order_by(NR1ActionItem.created_at.desc()).all()
    )
    trainings = (
        db.query(NR1TrainingItem)
        .filter(NR1TrainingItem.workspace_id == workspace.id)
        .order_by(NR1TrainingItem.created_at.desc())
        .all()
    )
    return risks, actions, trainings


def build_nr1_summary(db: Session, company: User, workspace: NR1Workspace | None = None) -> NR1SummaryResponse:
    workspace = workspace or ensure_nr1_workspace(db, company)
    participant_ids = _collect_participant_ids(db, company)
    risks, actions, trainings = _workspace_items(db, workspace)
    open_risks = [risk for risk in risks if risk.status in {NR1RiskStatus.OPEN.value, NR1RiskStatus.MITIGATING.value}]
    mitigating_risks = [risk for risk in risks if risk.status == NR1RiskStatus.MITIGATING.value]
    controlled_risks = [risk for risk in risks if risk.status == NR1RiskStatus.CONTROLLED.value]
    open_actions = [
        action
        for action in actions
        if action.status in {NR1ActionStatus.PLANNED.value, NR1ActionStatus.IN_PROGRESS.value, NR1ActionStatus.BLOCKED.value}
    ]
    overdue_actions = [action for action in actions if _is_action_overdue(action)]
    overdue_trainings = [training for training in trainings if _is_training_overdue(training)]
    template_count = sum(1 for item in (*risks, *actions, *trainings) if item.is_template)

    if len(participant_ids) < NR1_MIN_PARTICIPANTS:
        summary = (
            "Amostra insuficiente para exibir indicadores agregados. "
            "O workspace permanece operacional para estruturar PGR/GRO com riscos, acoes e treinamentos."
        )
        return NR1SummaryResponse(
            participant_count=len(participant_ids),
            minimum_participants=NR1_MIN_PARTICIPANTS,
            suppressed=True,
            signal_count=None,
            average_intensity=None,
            average_anxiety=None,
            average_stress=None,
            high_risk_signal_count=None,
            open_risk_count=len(open_risks),
            mitigating_risk_count=len(mitigating_risks),
            controlled_risk_count=len(controlled_risks),
            open_action_count=len(open_actions),
            overdue_action_count=len(overdue_actions),
            training_count=len(trainings),
            overdue_training_count=len(overdue_trainings),
            template_count=template_count,
            summary=summary,
            current_state="Amostra suprimida",
            privacy_note=NR1_PRIVACY_NOTE,
            generated_at=datetime.now(UTC),
        )

    logs = _collect_nr1_logs(db, participant_ids)
    average_intensity = _safe_average([log.intensity for log in logs])
    average_anxiety = _safe_average([log.anxiety for log in logs])
    average_stress = _safe_average([log.stress for log in logs])
    high_risk_signal_count = sum(
        1 for log in logs if log.intensity >= 7 or (log.anxiety or 0) >= 8 or (log.stress or 0) >= 8
    )
    if overdue_actions or overdue_trainings:
        current_state = "Atencao operacional"
    elif open_risks:
        current_state = "PGR em estruturação"
    else:
        current_state = "Monitoramento estavel"
    summary = (
        f"{len(participant_ids)} pessoas autorizaram sinais agregados. "
        f"Intensidade media {average_intensity if average_intensity is not None else 'indisponivel'}, "
        f"ansiedade {average_anxiety if average_anxiety is not None else 'indisponivel'} e "
        f"estresse {average_stress if average_stress is not None else 'indisponivel'}. "
        f"Riscos em aberto: {len(open_risks)}. Acoes em aberto: {len(open_actions)}. "
        f"Treinamentos vencidos: {len(overdue_trainings)}."
    )
    return NR1SummaryResponse(
        participant_count=len(participant_ids),
        minimum_participants=NR1_MIN_PARTICIPANTS,
        suppressed=False,
        signal_count=len(logs),
        average_intensity=average_intensity,
        average_anxiety=average_anxiety,
        average_stress=average_stress,
        high_risk_signal_count=high_risk_signal_count,
        open_risk_count=len(open_risks),
        mitigating_risk_count=len(mitigating_risks),
        controlled_risk_count=len(controlled_risks),
        open_action_count=len(open_actions),
        overdue_action_count=len(overdue_actions),
        training_count=len(trainings),
        overdue_training_count=len(overdue_trainings),
        template_count=template_count,
        summary=summary,
        current_state=current_state,
        privacy_note=NR1_PRIVACY_NOTE,
        generated_at=datetime.now(UTC),
    )


def build_nr1_workspace_overview(db: Session, company: User) -> NR1WorkspaceOverviewResponse:
    workspace = ensure_nr1_workspace(db, company)
    summary = build_nr1_summary(db, company, workspace)
    risks, actions, trainings = _workspace_items(db, workspace)
    risks_sorted = sorted(risks, key=lambda item: (item.status != NR1RiskStatus.OPEN.value, -item.severity, item.created_at), reverse=False)
    actions_sorted = sorted(actions, key=lambda item: (item.status == NR1ActionStatus.COMPLETED.value, item.due_on or date.max, item.created_at))
    trainings_sorted = sorted(
        trainings, key=lambda item: (item.status == NR1TrainingStatus.COMPLETED.value, item.due_on or date.max, item.created_at)
    )
    return NR1WorkspaceOverviewResponse(
        workspace=_serialize_workspace(workspace),
        summary=summary,
        risks=[_serialize_risk(item) for item in risks_sorted],
        actions=[_serialize_action(item) for item in actions_sorted],
        trainings=[_serialize_training(item) for item in trainings_sorted],
    )


def _touch_workspace(workspace: NR1Workspace) -> None:
    workspace.last_reviewed_at = datetime.now(UTC)


def update_nr1_workspace(db: Session, workspace: NR1Workspace, payload: NR1WorkspaceUpdate) -> NR1Workspace:
    if payload.organization_name is not None:
        workspace.organization_name = payload.organization_name.strip() or workspace.organization_name
    if payload.unit_name is not None:
        workspace.unit_name = payload.unit_name.strip() or None
    if payload.gro_owner_name is not None:
        workspace.gro_owner_name = payload.gro_owner_name.strip() or None
    if payload.scope_statement is not None:
        workspace.scope_statement = payload.scope_statement.strip() or None
    if payload.notes is not None:
        workspace.notes = payload.notes.strip() or None
    if payload.status is not None:
        workspace.status = payload.status.value
    _touch_workspace(workspace)
    db.flush()
    return workspace


def _require_risk_belongs_to_workspace(risk: NR1RiskItem, workspace: NR1Workspace) -> None:
    if risk.workspace_id != workspace.id:
        raise ValueError("Risk item does not belong to workspace")


def _require_action_belongs_to_workspace(action: NR1ActionItem, workspace: NR1Workspace) -> None:
    if action.workspace_id != workspace.id:
        raise ValueError("Action item does not belong to workspace")


def _require_training_belongs_to_workspace(training: NR1TrainingItem, workspace: NR1Workspace) -> None:
    if training.workspace_id != workspace.id:
        raise ValueError("Training item does not belong to workspace")


def create_nr1_risk(db: Session, workspace: NR1Workspace, payload: NR1RiskItemCreate) -> NR1RiskItem:
    risk = NR1RiskItem(
        workspace_id=workspace.id,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        category=payload.category.value,
        source=payload.source.value,
        status=payload.status.value,
        severity=payload.severity,
        likelihood=payload.likelihood,
        owner_label=payload.owner_label.strip() if payload.owner_label else None,
        due_on=payload.due_on,
        notes=payload.notes.strip() if payload.notes else None,
        is_template=payload.is_template,
        reviewed_at=datetime.now(UTC),
    )
    db.add(risk)
    _touch_workspace(workspace)
    db.flush()
    return risk


def update_nr1_risk(db: Session, workspace: NR1Workspace, risk: NR1RiskItem, payload: NR1RiskItemUpdate) -> NR1RiskItem:
    _require_risk_belongs_to_workspace(risk, workspace)
    if payload.title is not None:
        risk.title = payload.title.strip() or risk.title
    if payload.description is not None:
        risk.description = payload.description.strip() or None
    if payload.category is not None:
        risk.category = payload.category.value
    if payload.source is not None:
        risk.source = payload.source.value
    if payload.status is not None:
        risk.status = payload.status.value
    if payload.severity is not None:
        risk.severity = payload.severity
    if payload.likelihood is not None:
        risk.likelihood = payload.likelihood
    if payload.owner_label is not None:
        risk.owner_label = payload.owner_label.strip() or None
    if payload.due_on is not None:
        risk.due_on = payload.due_on
    if payload.notes is not None:
        risk.notes = payload.notes.strip() or None
    if payload.is_template is not None:
        risk.is_template = payload.is_template
    if payload.reviewed_at is not None:
        risk.reviewed_at = payload.reviewed_at
    else:
        risk.reviewed_at = datetime.now(UTC)
    _touch_workspace(workspace)
    db.flush()
    return risk


def delete_nr1_risk(db: Session, workspace: NR1Workspace, risk: NR1RiskItem) -> None:
    _require_risk_belongs_to_workspace(risk, workspace)
    db.delete(risk)
    _touch_workspace(workspace)
    db.flush()


def create_nr1_action(db: Session, workspace: NR1Workspace, payload: NR1ActionItemCreate) -> NR1ActionItem:
    if payload.risk_item_id:
        risk = db.get(NR1RiskItem, payload.risk_item_id)
        if not risk or risk.workspace_id != workspace.id:
            raise ValueError("Risk item not found in workspace")
    action = NR1ActionItem(
        workspace_id=workspace.id,
        risk_item_id=payload.risk_item_id,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        owner_label=payload.owner_label.strip() if payload.owner_label else None,
        status=payload.status.value,
        progress_percent=max(0, min(payload.progress_percent, 100)),
        due_on=payload.due_on,
        completed_on=payload.completed_on,
        notes=payload.notes.strip() if payload.notes else None,
        is_template=payload.is_template,
    )
    if action.status == NR1ActionStatus.COMPLETED.value and action.completed_on is None:
        action.completed_on = datetime.now(UTC).date()
        action.progress_percent = 100
    db.add(action)
    _touch_workspace(workspace)
    db.flush()
    return action


def update_nr1_action(db: Session, workspace: NR1Workspace, action: NR1ActionItem, payload: NR1ActionItemUpdate) -> NR1ActionItem:
    _require_action_belongs_to_workspace(action, workspace)
    if payload.risk_item_id is not None:
        risk = db.get(NR1RiskItem, payload.risk_item_id)
        if not risk or risk.workspace_id != workspace.id:
            raise ValueError("Risk item not found in workspace")
        action.risk_item_id = payload.risk_item_id
    if payload.title is not None:
        action.title = payload.title.strip() or action.title
    if payload.description is not None:
        action.description = payload.description.strip() or None
    if payload.owner_label is not None:
        action.owner_label = payload.owner_label.strip() or None
    if payload.status is not None:
        action.status = payload.status.value
    if payload.progress_percent is not None:
        action.progress_percent = max(0, min(payload.progress_percent, 100))
    if payload.due_on is not None:
        action.due_on = payload.due_on
    if payload.completed_on is not None:
        action.completed_on = payload.completed_on
    if payload.notes is not None:
        action.notes = payload.notes.strip() or None
    if payload.is_template is not None:
        action.is_template = payload.is_template
    if action.status == NR1ActionStatus.COMPLETED.value:
        action.progress_percent = 100
        if action.completed_on is None:
            action.completed_on = datetime.now(UTC).date()
    _touch_workspace(workspace)
    db.flush()
    return action


def delete_nr1_action(db: Session, workspace: NR1Workspace, action: NR1ActionItem) -> None:
    _require_action_belongs_to_workspace(action, workspace)
    db.delete(action)
    _touch_workspace(workspace)
    db.flush()


def create_nr1_training(db: Session, workspace: NR1Workspace, payload: NR1TrainingItemCreate) -> NR1TrainingItem:
    training = NR1TrainingItem(
        workspace_id=workspace.id,
        title=payload.title.strip(),
        audience=payload.audience.strip() if payload.audience else None,
        status=payload.status.value,
        frequency_days=payload.frequency_days,
        required_hours=payload.required_hours,
        due_on=payload.due_on,
        completed_on=payload.completed_on,
        notes=payload.notes.strip() if payload.notes else None,
        is_template=payload.is_template,
    )
    if training.status == NR1TrainingStatus.COMPLETED.value and training.completed_on is None:
        training.completed_on = datetime.now(UTC).date()
    db.add(training)
    _touch_workspace(workspace)
    db.flush()
    return training


def update_nr1_training(
    db: Session,
    workspace: NR1Workspace,
    training: NR1TrainingItem,
    payload: NR1TrainingItemUpdate,
) -> NR1TrainingItem:
    _require_training_belongs_to_workspace(training, workspace)
    if payload.title is not None:
        training.title = payload.title.strip() or training.title
    if payload.audience is not None:
        training.audience = payload.audience.strip() or None
    if payload.status is not None:
        training.status = payload.status.value
    if payload.frequency_days is not None:
        training.frequency_days = payload.frequency_days
    if payload.required_hours is not None:
        training.required_hours = payload.required_hours
    if payload.due_on is not None:
        training.due_on = payload.due_on
    if payload.completed_on is not None:
        training.completed_on = payload.completed_on
    if payload.notes is not None:
        training.notes = payload.notes.strip() or None
    if payload.is_template is not None:
        training.is_template = payload.is_template
    if training.status == NR1TrainingStatus.COMPLETED.value and training.completed_on is None:
        training.completed_on = datetime.now(UTC).date()
    _touch_workspace(workspace)
    db.flush()
    return training


def delete_nr1_training(db: Session, workspace: NR1Workspace, training: NR1TrainingItem) -> None:
    _require_training_belongs_to_workspace(training, workspace)
    db.delete(training)
    _touch_workspace(workspace)
    db.flush()


def record_nr1_audit(
    db: Session,
    *,
    actor_user_id: str,
    resource_type: str,
    resource_id: str | None = None,
    target_user_id: str | None = None,
    metadata: dict[str, object] | None = None,
    action: AuditAction = AuditAction.ADMIN_CONFIG_UPDATED,
) -> None:
    write_audit_log(
        db,
        action=action,
        resource_type=resource_type,
        actor_user_id=actor_user_id,
        target_user_id=target_user_id,
        resource_id=resource_id,
        metadata=metadata,
    )

