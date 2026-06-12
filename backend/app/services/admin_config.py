from __future__ import annotations

import json
from dataclasses import asdict, replace
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import SessionLocal
from app.models.admin_config import AdminConfig
from app.models.user import UserRole
from app.services.commercial_plans import CommercialPlan, commercial_plan_for_role, list_commercial_plans

ADMIN_SETTING_KEYS = (
    "smtp_host",
    "smtp_port",
    "smtp_username",
    "smtp_password",
    "smtp_from_email",
    "smtp_use_tls",
    "admin_alert_email",
    "password_reset_url",
    "billing_pending_alerts_auto_enabled",
    "billing_pending_alerts_auto_days",
    "billing_pending_alerts_auto_interval_hours",
    "billing_pending_alerts_auto_limit",
    "billing_webhooks_enabled",
    "billing_webhook_secret",
    "mercado_pago_access_token",
    "mercado_pago_public_key",
    "mercado_pago_webhook_secret",
    "mercado_pago_success_url",
    "mercado_pago_pending_url",
    "mercado_pago_failure_url",
)

COMMERCIAL_PLAN_EDITABLE_FIELDS = (
    "title",
    "description",
    "admin_price_placeholder",
    "price_brl",
    "billing_interval_placeholder",
    "included_features",
    "checkout_public_enabled",
    "admin_only_pricing",
)


def commercial_plan_config_key(role: UserRole) -> str:
    return f"commercial_plan:{role.value}"


def _encode_value(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _decode_value(value: str | None) -> Any:
    if value is None:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def _collect_config_rows(db: Session) -> dict[str, Any]:
    try:
        rows = db.query(AdminConfig).all()
    except Exception:
        return {}
    return {row.key: _decode_value(row.value) for row in rows}


def _load_config_map(db: Session | None = None) -> dict[str, Any]:
    if db is not None:
        return _collect_config_rows(db)
    session = SessionLocal()
    try:
        return _collect_config_rows(session)
    finally:
        session.close()


def get_admin_config_value(key: str, db: Session | None = None, default: Any = None) -> Any:
    return _load_config_map(db).get(key, default)


def set_admin_config_value(db: Session, key: str, value: Any) -> None:
    row = db.get(AdminConfig, key)
    if value is None:
        if row is not None:
            db.delete(row)
        return
    payload = _encode_value(value)
    if row is None:
        db.add(AdminConfig(key=key, value=payload))
    else:
        row.value = payload


def delete_admin_config_value(db: Session, key: str) -> None:
    row = db.get(AdminConfig, key)
    if row is not None:
        db.delete(row)


def _normalize_features(values: Any) -> tuple[str, ...]:
    if not isinstance(values, (list, tuple)):
        return ()
    features = [str(item).strip() for item in values if str(item).strip()]
    return tuple(features)


def effective_settings(db: Session | None = None) -> Settings:
    settings = get_settings()
    config_map = _load_config_map(db)
    updates: dict[str, Any] = {}
    for key in ADMIN_SETTING_KEYS:
        if key in config_map:
            updates[key] = config_map[key]
    if not updates:
        return settings
    return settings.model_copy(update=updates)


def commercial_plan_override(role: UserRole, db: Session | None = None) -> dict[str, Any] | None:
    override = get_admin_config_value(commercial_plan_config_key(role), db=db)
    return override if isinstance(override, dict) else None


def save_commercial_plan_override(db: Session, role: UserRole, payload: dict[str, Any]) -> None:
    set_admin_config_value(db, commercial_plan_config_key(role), payload)


def delete_commercial_plan_override_by_role(db: Session, role: UserRole) -> None:
    delete_admin_config_value(db, commercial_plan_config_key(role))


def effective_commercial_plan(role: UserRole, db: Session | None = None) -> CommercialPlan | None:
    base_plan = commercial_plan_for_role(role)
    if base_plan is None:
        return None
    override = commercial_plan_override(role, db=db)
    if not override:
        return base_plan

    merged = asdict(base_plan)
    merged.update({key: value for key, value in override.items() if key in COMMERCIAL_PLAN_EDITABLE_FIELDS})
    merged["included_features"] = _normalize_features(merged.get("included_features"))
    merged["price_brl"] = float(merged.get("price_brl", base_plan.price_brl))
    merged["checkout_public_enabled"] = bool(merged.get("checkout_public_enabled", base_plan.checkout_public_enabled))
    merged["admin_only_pricing"] = bool(merged.get("admin_only_pricing", base_plan.admin_only_pricing))
    return replace(
        base_plan,
        title=str(merged["title"]).strip() or base_plan.title,
        description=str(merged["description"]).strip() or base_plan.description,
        admin_price_placeholder=str(merged["admin_price_placeholder"]).strip() or base_plan.admin_price_placeholder,
        price_brl=float(merged["price_brl"]),
        billing_interval_placeholder=str(merged["billing_interval_placeholder"]).strip()
        or base_plan.billing_interval_placeholder,
        included_features=_normalize_features(merged.get("included_features")) or base_plan.included_features,
        checkout_public_enabled=bool(merged["checkout_public_enabled"]),
        admin_only_pricing=bool(merged["admin_only_pricing"]),
    )


def list_effective_commercial_plans(db: Session | None = None) -> list[tuple[CommercialPlan, bool]]:
    config_map = _load_config_map(db)
    plans: list[tuple[CommercialPlan, bool]] = []
    for plan in list_commercial_plans():
        override = config_map.get(commercial_plan_config_key(plan.role))
        plans.append((effective_commercial_plan(plan.role, db=db) or plan, isinstance(override, dict)))
    return plans
