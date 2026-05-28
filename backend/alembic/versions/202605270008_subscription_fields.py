"""subscription fields

Revision ID: 202605270008
Revises: 202605270007
Create Date: 2026-05-27 00:08:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "202605270008"
down_revision: str | None = "202605270007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


PLAN_VALUES = (
    "FREE_USER",
    "PSYCHOLOGIST_PRO",
    "COMPANY_NR1",
    "CLINIC",
    "INSTITUTIONAL",
    "SPONSOR",
    "INTERNAL",
)
STATUS_VALUES = ("FREE", "PENDING", "TRIAL", "ACTIVE", "PAST_DUE", "CANCELED")


def _column_exists(table_name: str, column_name: str) -> bool:
    inspector = inspect(op.get_bind())
    if not inspector.has_table(table_name):
        return False
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def upgrade() -> None:
    plan_enum = sa.Enum(*PLAN_VALUES, name="subscriptionplan")
    status_enum = sa.Enum(*STATUS_VALUES, name="subscriptionstatus")
    bind = op.get_bind()
    plan_enum.create(bind, checkfirst=True)
    status_enum.create(bind, checkfirst=True)

    if not _column_exists("bergmann_users", "subscription_plan"):
        op.add_column(
            "bergmann_users",
            sa.Column("subscription_plan", plan_enum, nullable=False, server_default="FREE_USER"),
        )
    if not _column_exists("bergmann_users", "subscription_status"):
        op.add_column(
            "bergmann_users",
            sa.Column("subscription_status", status_enum, nullable=False, server_default="FREE"),
        )

    op.execute(
        """
        UPDATE bergmann_users
        SET subscription_plan = CASE
            WHEN role = 'USER' THEN 'FREE_USER'
            WHEN role = 'PSYCHOLOGIST' THEN 'PSYCHOLOGIST_PRO'
            WHEN role = 'COMPANY' THEN 'COMPANY_NR1'
            WHEN role = 'CLINIC' THEN 'CLINIC'
            WHEN role = 'SPONSOR' THEN 'SPONSOR'
            WHEN role = 'SUPER_ADMIN' THEN 'INTERNAL'
            ELSE 'INSTITUTIONAL'
        END
        """
    )
    op.execute(
        """
        UPDATE bergmann_users
        SET subscription_status = CASE
            WHEN role = 'USER' THEN 'FREE'
            WHEN role = 'SUPER_ADMIN' THEN 'ACTIVE'
            WHEN status = 'ACTIVE' THEN 'TRIAL'
            WHEN status = 'REJECTED' THEN 'CANCELED'
            ELSE 'PENDING'
        END
        """
    )
    if bind.dialect.name != "sqlite":
        op.alter_column("bergmann_users", "subscription_plan", server_default=None)
        op.alter_column("bergmann_users", "subscription_status", server_default=None)


def downgrade() -> None:
    if _column_exists("bergmann_users", "subscription_status"):
        op.drop_column("bergmann_users", "subscription_status")
    if _column_exists("bergmann_users", "subscription_plan"):
        op.drop_column("bergmann_users", "subscription_plan")
    sa.Enum(*STATUS_VALUES, name="subscriptionstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(*PLAN_VALUES, name="subscriptionplan").drop(op.get_bind(), checkfirst=True)
