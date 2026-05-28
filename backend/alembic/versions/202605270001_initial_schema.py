"""initial schema

Revision ID: 202605270001
Revises:
Create Date: 2026-05-27 00:01:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision: str = "202605270001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


user_role = postgresql.ENUM(
    "USER",
    "PSYCHOLOGIST",
    "COMPANY",
    "NGO",
    "HOSPITAL",
    "CLINIC",
    "SPONSOR",
    "PUBLIC_INSTITUTION",
    "SUPER_ADMIN",
    name="userrole",
    create_type=False,
)
account_status = postgresql.ENUM(
    "ACTIVE",
    "PENDING_VERIFICATION",
    "REJECTED",
    name="accountstatus",
    create_type=False,
)


def _table_exists(table_name: str) -> bool:
    return inspect(op.get_bind()).has_table(table_name)


def _column_names(table_name: str) -> set[str]:
    if not _table_exists(table_name):
        return set()
    return {column["name"] for column in inspect(op.get_bind()).get_columns(table_name)}


def _index_exists(table_name: str, index_name: str) -> bool:
    if not _table_exists(table_name):
        return False
    return any(index["name"] == index_name for index in inspect(op.get_bind()).get_indexes(table_name))


def _ensure_users_columns() -> None:
    columns = _column_names("users")
    if "full_name" not in columns:
        op.add_column("users", sa.Column("full_name", sa.String(length=160), nullable=False, server_default="Usuario"))
        op.alter_column("users", "full_name", server_default=None)
    if "password_hash" not in columns:
        op.add_column(
            "users",
            sa.Column("password_hash", sa.String(length=255), nullable=False, server_default="legacy_unusable_password"),
        )
        op.alter_column("users", "password_hash", server_default=None)
    if "role" not in columns:
        op.add_column("users", sa.Column("role", user_role, nullable=False, server_default="USER"))
        op.alter_column("users", "role", server_default=None)
    if "status" not in columns:
        op.add_column("users", sa.Column("status", account_status, nullable=False, server_default="ACTIVE"))
        op.alter_column("users", "status", server_default=None)
    if "created_at" not in columns:
        op.add_column(
            "users",
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        )
        op.alter_column("users", "created_at", server_default=None)
    if "updated_at" not in columns:
        op.add_column(
            "users",
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        )
        op.alter_column("users", "updated_at", server_default=None)


def upgrade() -> None:
    user_role.create(op.get_bind(), checkfirst=True)
    account_status.create(op.get_bind(), checkfirst=True)
    if _table_exists("users"):
        _ensure_users_columns()
    else:
        op.create_table(
            "users",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("email", sa.String(length=320), nullable=False),
            sa.Column("full_name", sa.String(length=160), nullable=False),
            sa.Column("password_hash", sa.String(length=255), nullable=False),
            sa.Column("role", user_role, nullable=False),
            sa.Column("status", account_status, nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _index_exists("users", op.f("ix_users_email")):
        op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    if not _table_exists("chat_sessions"):
        op.create_table(
            "chat_sessions",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _table_exists("refresh_tokens"):
        op.create_table(
            "refresh_tokens",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("token_hash", sa.String(length=255), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _index_exists("refresh_tokens", op.f("ix_refresh_tokens_token_hash")):
        op.create_index(op.f("ix_refresh_tokens_token_hash"), "refresh_tokens", ["token_hash"], unique=True)
    if not _table_exists("sos_events"):
        op.create_table(
            "sos_events",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("intensity", sa.String(length=24), nullable=False),
            sa.Column("message", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _table_exists("chat_messages"):
        op.create_table(
            "chat_messages",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("session_id", sa.String(length=36), nullable=False),
            sa.Column("sender", sa.String(length=24), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("risk_level", sa.String(length=24), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["session_id"], ["chat_sessions.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )


def downgrade() -> None:
    op.drop_table("chat_messages")
    op.drop_table("sos_events")
    op.drop_index(op.f("ix_refresh_tokens_token_hash"), table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
    op.drop_table("chat_sessions")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    account_status.drop(op.get_bind(), checkfirst=True)
    user_role.drop(op.get_bind(), checkfirst=True)
