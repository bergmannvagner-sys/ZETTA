"""admin config overrides

Revision ID: 202605270019
Revises: 202605270018
Create Date: 2026-05-27 00:19:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "202605270019"
down_revision: str | None = "202605270018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(table_name: str) -> bool:
    return inspect(op.get_bind()).has_table(table_name)


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
    _add_audit_action_once("ADMIN_CONFIG_UPDATED")

    if not _table_exists("bergmann_admin_config"):
        op.create_table(
            "bergmann_admin_config",
            sa.Column("key", sa.String(length=120), nullable=False),
            sa.Column("value", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("key"),
        )


def downgrade() -> None:
    if _table_exists("bergmann_admin_config"):
        op.drop_table("bergmann_admin_config")
