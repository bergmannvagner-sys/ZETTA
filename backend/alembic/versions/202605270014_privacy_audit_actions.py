"""privacy audit actions

Revision ID: 202605270014
Revises: 202605270013
Create Date: 2026-05-27 00:14:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "202605270014"
down_revision: str | None = "202605270013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        for value in ("CONSENT_REVOKED", "DATA_EXPORT_REQUESTED"):
            op.execute(
                f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_enum
                        WHERE enumlabel = '{value}'
                        AND enumtypid = 'auditaction'::regtype
                    ) THEN
                        ALTER TYPE auditaction ADD VALUE '{value}';
                    END IF;
                END
                $$;
                """
            )


def downgrade() -> None:
    pass
