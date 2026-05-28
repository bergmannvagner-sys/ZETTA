"""app-owned schema

Revision ID: 202605270003
Revises: 202605270002
Create Date: 2026-05-27 00:03:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision: str = "202605270003"
down_revision: str | None = "202605270002"
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
consent_type = postgresql.ENUM("LGPD_MVP", name="consenttype", create_type=False)
audit_action = postgresql.ENUM(
    "USER_REGISTERED",
    "USER_LOGIN",
    "TOKEN_REFRESHED",
    "CONSENT_ACCEPTED",
    "CHAT_MESSAGE_CREATED",
    "SOS_EVENT_CREATED",
    "ACCOUNT_APPROVED",
    "ACCOUNT_REJECTED",
    name="auditaction",
    create_type=False,
)


def _table_exists(table_name: str) -> bool:
    return inspect(op.get_bind()).has_table(table_name)


def _index_exists(table_name: str, index_name: str) -> bool:
    if not _table_exists(table_name):
        return False
    return any(index["name"] == index_name for index in inspect(op.get_bind()).get_indexes(table_name))


def upgrade() -> None:
    user_role.create(op.get_bind(), checkfirst=True)
    account_status.create(op.get_bind(), checkfirst=True)
    consent_type.create(op.get_bind(), checkfirst=True)
    audit_action.create(op.get_bind(), checkfirst=True)

    if not _table_exists("bergmann_users"):
        op.create_table(
            "bergmann_users",
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
    if not _index_exists("bergmann_users", op.f("ix_bergmann_users_email")):
        op.create_index(op.f("ix_bergmann_users_email"), "bergmann_users", ["email"], unique=True)

    if not _table_exists("bergmann_refresh_tokens"):
        op.create_table(
            "bergmann_refresh_tokens",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("token_hash", sa.String(length=255), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["bergmann_users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _index_exists("bergmann_refresh_tokens", op.f("ix_bergmann_refresh_tokens_token_hash")):
        op.create_index(
            op.f("ix_bergmann_refresh_tokens_token_hash"),
            "bergmann_refresh_tokens",
            ["token_hash"],
            unique=True,
        )

    if not _table_exists("bergmann_chat_sessions"):
        op.create_table(
            "bergmann_chat_sessions",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["bergmann_users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _table_exists("bergmann_chat_messages"):
        op.create_table(
            "bergmann_chat_messages",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("session_id", sa.String(length=36), nullable=False),
            sa.Column("sender", sa.String(length=24), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("risk_level", sa.String(length=24), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["session_id"], ["bergmann_chat_sessions.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _table_exists("bergmann_sos_events"):
        op.create_table(
            "bergmann_sos_events",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("intensity", sa.String(length=24), nullable=False),
            sa.Column("message", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["bergmann_users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _table_exists("bergmann_consent_records"):
        op.create_table(
            "bergmann_consent_records",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("consent_type", consent_type, nullable=False),
            sa.Column("policy_version", sa.String(length=32), nullable=False),
            sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["bergmann_users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _table_exists("bergmann_audit_logs"):
        op.create_table(
            "bergmann_audit_logs",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("actor_user_id", sa.String(length=36), nullable=True),
            sa.Column("target_user_id", sa.String(length=36), nullable=True),
            sa.Column("action", audit_action, nullable=False),
            sa.Column("resource_type", sa.String(length=80), nullable=False),
            sa.Column("resource_id", sa.String(length=36), nullable=True),
            sa.Column("metadata_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["actor_user_id"], ["bergmann_users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["target_user_id"], ["bergmann_users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )


def downgrade() -> None:
    op.drop_table("bergmann_audit_logs")
    op.drop_table("bergmann_consent_records")
    op.drop_table("bergmann_sos_events")
    op.drop_table("bergmann_chat_messages")
    op.drop_table("bergmann_chat_sessions")
    op.drop_index(op.f("ix_bergmann_refresh_tokens_token_hash"), table_name="bergmann_refresh_tokens")
    op.drop_table("bergmann_refresh_tokens")
    op.drop_index(op.f("ix_bergmann_users_email"), table_name="bergmann_users")
    op.drop_table("bergmann_users")
