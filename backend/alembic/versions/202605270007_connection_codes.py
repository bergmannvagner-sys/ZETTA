"""connection codes

Revision ID: 202605270007
Revises: 202605270006
Create Date: 2026-05-27 00:07:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "202605270007"
down_revision: str | None = "202605270006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_exists(table_name: str, column_name: str) -> bool:
    inspector = inspect(op.get_bind())
    if not inspector.has_table(table_name):
        return False
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def _index_exists(table_name: str, index_name: str) -> bool:
    inspector = inspect(op.get_bind())
    if not inspector.has_table(table_name):
        return False
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    if not _column_exists("bergmann_users", "connection_code"):
        op.add_column("bergmann_users", sa.Column("connection_code", sa.String(length=16), nullable=True))
    if not _index_exists("bergmann_users", op.f("ix_bergmann_users_connection_code")):
        op.create_index(op.f("ix_bergmann_users_connection_code"), "bergmann_users", ["connection_code"], unique=True)


def downgrade() -> None:
    if _index_exists("bergmann_users", op.f("ix_bergmann_users_connection_code")):
        op.drop_index(op.f("ix_bergmann_users_connection_code"), table_name="bergmann_users")
    if _column_exists("bergmann_users", "connection_code"):
        op.drop_column("bergmann_users", "connection_code")
