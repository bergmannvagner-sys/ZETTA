"""billing provider fields

Revision ID: 202605270010
Revises: 202605270009
Create Date: 2026-05-27 00:10:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "202605270010"
down_revision: str | None = "202605270009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_exists(table_name: str, column_name: str) -> bool:
    inspector = inspect(op.get_bind())
    if not inspector.has_table(table_name):
        return False
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def upgrade() -> None:
    columns = (
        ("billing_provider", sa.Column("billing_provider", sa.String(length=32), nullable=True)),
        ("billing_customer_id", sa.Column("billing_customer_id", sa.String(length=120), nullable=True)),
        ("billing_subscription_id", sa.Column("billing_subscription_id", sa.String(length=120), nullable=True)),
        ("billing_last_event_id", sa.Column("billing_last_event_id", sa.String(length=160), nullable=True)),
        ("billing_last_event_at", sa.Column("billing_last_event_at", sa.DateTime(timezone=True), nullable=True)),
    )
    for name, column in columns:
        if not _column_exists("bergmann_users", name):
            op.add_column("bergmann_users", column)

    op.create_index(
        op.f("ix_bergmann_users_billing_customer_id"),
        "bergmann_users",
        ["billing_customer_id"],
        unique=False,
        if_not_exists=True,
    )
    op.create_index(
        op.f("ix_bergmann_users_billing_subscription_id"),
        "bergmann_users",
        ["billing_subscription_id"],
        unique=False,
        if_not_exists=True,
    )
    op.create_index(
        op.f("ix_bergmann_users_billing_last_event_id"),
        "bergmann_users",
        ["billing_last_event_id"],
        unique=False,
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_bergmann_users_billing_last_event_id"), table_name="bergmann_users", if_exists=True)
    op.drop_index(op.f("ix_bergmann_users_billing_subscription_id"), table_name="bergmann_users", if_exists=True)
    op.drop_index(op.f("ix_bergmann_users_billing_customer_id"), table_name="bergmann_users", if_exists=True)
    for name in (
        "billing_last_event_at",
        "billing_last_event_id",
        "billing_subscription_id",
        "billing_customer_id",
        "billing_provider",
    ):
        if _column_exists("bergmann_users", name):
            op.drop_column("bergmann_users", name)
