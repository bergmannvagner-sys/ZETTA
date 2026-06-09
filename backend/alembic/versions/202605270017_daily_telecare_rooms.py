"""daily telecare rooms

Revision ID: 202605270017
Revises: 202605270016
Create Date: 2026-05-27 00:17:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


revision: str = "202605270017"
down_revision: str | None = "202605270016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


TABLE_NAME = "bergmann_telecare_sessions"


def _table_exists(table_name: str) -> bool:
    return inspect(op.get_bind()).has_table(table_name)


def _column_exists(table_name: str, column_name: str) -> bool:
    return any(column["name"] == column_name for column in inspect(op.get_bind()).get_columns(table_name))


def _index_exists(table_name: str, index_name: str) -> bool:
    return any(index["name"] == index_name for index in inspect(op.get_bind()).get_indexes(table_name))


def _add_column_once(column: sa.Column) -> None:
    if _table_exists(TABLE_NAME) and not _column_exists(TABLE_NAME, column.name):
        op.add_column(TABLE_NAME, column)


def _create_index_once(index_name: str, columns: list[str], unique: bool = False) -> None:
    if _table_exists(TABLE_NAME) and not _index_exists(TABLE_NAME, index_name):
        op.create_index(index_name, TABLE_NAME, columns, unique=unique)


def upgrade() -> None:
    _add_column_once(sa.Column("daily_room_name", sa.String(length=128), nullable=True))
    _add_column_once(sa.Column("daily_room_url", sa.String(length=512), nullable=True))
    _add_column_once(sa.Column("daily_room_created_at", sa.DateTime(timezone=True), nullable=True))
    _create_index_once("ix_bergmann_telecare_sessions_daily_room_name", ["daily_room_name"], unique=True)


def downgrade() -> None:
    if not _table_exists(TABLE_NAME):
        return
    if _index_exists(TABLE_NAME, "ix_bergmann_telecare_sessions_daily_room_name"):
        op.drop_index("ix_bergmann_telecare_sessions_daily_room_name", table_name=TABLE_NAME)
    if _column_exists(TABLE_NAME, "daily_room_created_at"):
        op.drop_column(TABLE_NAME, "daily_room_created_at")
    if _column_exists(TABLE_NAME, "daily_room_url"):
        op.drop_column(TABLE_NAME, "daily_room_url")
    if _column_exists(TABLE_NAME, "daily_room_name"):
        op.drop_column(TABLE_NAME, "daily_room_name")
