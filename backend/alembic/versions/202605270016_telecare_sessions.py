"""telecare sessions

Revision ID: 202605270016
Revises: 202605270015
Create Date: 2026-05-27 00:16:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


revision: str = "202605270016"
down_revision: str | None = "202605270015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(table_name: str) -> bool:
    return inspect(op.get_bind()).has_table(table_name)


def _index_exists(table_name: str, index_name: str) -> bool:
    return any(index["name"] == index_name for index in inspect(op.get_bind()).get_indexes(table_name))


def _create_index_once(index_name: str, table_name: str, columns: list[str]) -> None:
    if _table_exists(table_name) and not _index_exists(table_name, index_name):
        op.create_index(index_name, table_name, columns)


def _add_audit_action_once(value: str) -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute(
        f"""
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auditaction') THEN
                    ALTER TYPE auditaction ADD VALUE IF NOT EXISTS '{value}';
                END IF;
            END
            $$;
            """
    )


def upgrade() -> None:
    _add_audit_action_once("TELECARE_SESSION_REQUESTED")
    _add_audit_action_once("TELECARE_SESSION_STATUS_UPDATED")

    if not _table_exists("bergmann_telecare_sessions"):
        op.create_table(
            "bergmann_telecare_sessions",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("requester_user_id", sa.String(length=36), nullable=False),
            sa.Column("provider_user_id", sa.String(length=36), nullable=False),
            sa.Column("provider_role", sa.String(length=32), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("room_code", sa.String(length=24), nullable=False),
            sa.Column("session_price_cents", sa.Integer(), nullable=False),
            sa.Column("platform_fee_bps", sa.Integer(), nullable=False),
            sa.Column("platform_fee_cents", sa.Integer(), nullable=False),
            sa.Column("provider_payout_cents", sa.Integer(), nullable=False),
            sa.Column("payment_status", sa.String(length=32), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=True),
            sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["provider_user_id"], ["bergmann_users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["requester_user_id"], ["bergmann_users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("room_code", name="uq_bergmann_telecare_sessions_room_code"),
        )

    _create_index_once("ix_bergmann_telecare_sessions_requester_user_id", "bergmann_telecare_sessions", ["requester_user_id"])
    _create_index_once("ix_bergmann_telecare_sessions_provider_user_id", "bergmann_telecare_sessions", ["provider_user_id"])
    _create_index_once("ix_bergmann_telecare_sessions_status", "bergmann_telecare_sessions", ["status"])
    _create_index_once("ix_bergmann_telecare_sessions_room_code", "bergmann_telecare_sessions", ["room_code"])


def downgrade() -> None:
    if _table_exists("bergmann_telecare_sessions"):
        op.drop_table("bergmann_telecare_sessions")
