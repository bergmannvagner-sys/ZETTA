"""billing webhook audit action

Revision ID: 202605270011
Revises: 202605270010
Create Date: 2026-05-27 00:11:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "202605270011"
down_revision: str | None = "202605270010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_enum
                    WHERE enumlabel = 'BILLING_WEBHOOK_PROCESSED'
                    AND enumtypid = 'auditaction'::regtype
                ) THEN
                    ALTER TYPE auditaction ADD VALUE 'BILLING_WEBHOOK_PROCESSED';
                END IF;
            END
            $$;
            """
        )


def downgrade() -> None:
    pass
