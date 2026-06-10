"""privacy audit actions v2

Revision ID: 202605270018
Revises: 202605270017
Create Date: 2026-05-27 00:18:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "202605270018"
down_revision: str | None = "202605270017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


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
    for value in (
        "JOURNAL_ENTRY_CREATED",
        "EMOTION_LOG_CREATED",
        "SHARING_CONSENT_GRANTED",
        "SHARING_CONSENT_REVOKED",
        "EMOTIONAL_REPORT_CREATED",
        "NR1_REPORT_VIEWED",
        "CARE_REMINDER_CREATED",
        "CARE_REMINDER_COMPLETED",
    ):
        _add_audit_action_once(value)


def downgrade() -> None:
    pass
