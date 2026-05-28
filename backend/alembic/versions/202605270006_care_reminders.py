"""care reminders

Revision ID: 202605270006
Revises: 202605270005
Create Date: 2026-05-27 00:06:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "202605270006"
down_revision: str | None = "202605270005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(table_name: str) -> bool:
    return inspect(op.get_bind()).has_table(table_name)


def _index_exists(table_name: str, index_name: str) -> bool:
    if not _table_exists(table_name):
        return False
    return any(index["name"] == index_name for index in inspect(op.get_bind()).get_indexes(table_name))


def upgrade() -> None:
    if not _table_exists("bergmann_care_reminders"):
        op.create_table(
            "bergmann_care_reminders",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("title", sa.String(length=120), nullable=False),
            sa.Column(
                "category",
                sa.Enum("WATER", "PAUSE", "BREATHING", "REST", "ROUTINE", "CUSTOM", name="careremindercategory"),
                nullable=False,
            ),
            sa.Column("cadence", sa.String(length=32), nullable=False),
            sa.Column("time_local", sa.String(length=5), nullable=True),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("active", sa.Boolean(), nullable=False),
            sa.Column("last_completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["bergmann_users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _index_exists("bergmann_care_reminders", op.f("ix_bergmann_care_reminders_user_id")):
        op.create_index(op.f("ix_bergmann_care_reminders_user_id"), "bergmann_care_reminders", ["user_id"])


def downgrade() -> None:
    if _index_exists("bergmann_care_reminders", op.f("ix_bergmann_care_reminders_user_id")):
        op.drop_index(op.f("ix_bergmann_care_reminders_user_id"), table_name="bergmann_care_reminders")
    if _table_exists("bergmann_care_reminders"):
        op.drop_table("bergmann_care_reminders")
