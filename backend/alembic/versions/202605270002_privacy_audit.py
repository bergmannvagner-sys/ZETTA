"""privacy consent and audit logs

Revision ID: 202605270002
Revises: 202605270001
Create Date: 2026-05-27 00:02:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202605270002"
down_revision: str | None = "202605270001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


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


def upgrade() -> None:
    consent_type.create(op.get_bind(), checkfirst=True)
    audit_action.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "consent_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("consent_type", consent_type, nullable=False),
        sa.Column("policy_version", sa.String(length=32), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("actor_user_id", sa.String(length=36), nullable=True),
        sa.Column("target_user_id", sa.String(length=36), nullable=True),
        sa.Column("action", audit_action, nullable=False),
        sa.Column("resource_type", sa.String(length=80), nullable=False),
        sa.Column("resource_id", sa.String(length=36), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["target_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("consent_records")
    audit_action.drop(op.get_bind(), checkfirst=True)
    consent_type.drop(op.get_bind(), checkfirst=True)
