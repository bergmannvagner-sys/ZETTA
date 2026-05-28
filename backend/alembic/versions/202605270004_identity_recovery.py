"""identity verification and password recovery

Revision ID: 202605270004
Revises: 202605270003
Create Date: 2026-05-27 00:04:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "202605270004"
down_revision: str | None = "202605270003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(table_name: str) -> bool:
    return inspect(op.get_bind()).has_table(table_name)


def _column_exists(table_name: str, column_name: str) -> bool:
    if not _table_exists(table_name):
        return False
    return any(column["name"] == column_name for column in inspect(op.get_bind()).get_columns(table_name))


def _index_exists(table_name: str, index_name: str) -> bool:
    if not _table_exists(table_name):
        return False
    return any(index["name"] == index_name for index in inspect(op.get_bind()).get_indexes(table_name))


def upgrade() -> None:
    if not _column_exists("bergmann_users", "document_type"):
        op.add_column("bergmann_users", sa.Column("document_type", sa.String(length=24), nullable=True))
    if not _column_exists("bergmann_users", "document_value_hash"):
        op.add_column("bergmann_users", sa.Column("document_value_hash", sa.String(length=64), nullable=True))
    if not _column_exists("bergmann_users", "document_last4"):
        op.add_column("bergmann_users", sa.Column("document_last4", sa.String(length=8), nullable=True))
    if not _index_exists("bergmann_users", op.f("ix_bergmann_users_document_value_hash")):
        op.create_index(
            op.f("ix_bergmann_users_document_value_hash"),
            "bergmann_users",
            ["document_value_hash"],
            unique=True,
        )

    if not _table_exists("bergmann_password_reset_tokens"):
        op.create_table(
            "bergmann_password_reset_tokens",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("token_hash", sa.String(length=64), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["bergmann_users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _index_exists(
        "bergmann_password_reset_tokens",
        op.f("ix_bergmann_password_reset_tokens_token_hash"),
    ):
        op.create_index(
            op.f("ix_bergmann_password_reset_tokens_token_hash"),
            "bergmann_password_reset_tokens",
            ["token_hash"],
            unique=True,
        )


def downgrade() -> None:
    if _index_exists("bergmann_password_reset_tokens", op.f("ix_bergmann_password_reset_tokens_token_hash")):
        op.drop_index(
            op.f("ix_bergmann_password_reset_tokens_token_hash"),
            table_name="bergmann_password_reset_tokens",
        )
    if _table_exists("bergmann_password_reset_tokens"):
        op.drop_table("bergmann_password_reset_tokens")
    if _index_exists("bergmann_users", op.f("ix_bergmann_users_document_value_hash")):
        op.drop_index(op.f("ix_bergmann_users_document_value_hash"), table_name="bergmann_users")
    for column_name in ("document_last4", "document_value_hash", "document_type"):
        if _column_exists("bergmann_users", column_name):
            op.drop_column("bergmann_users", column_name)
