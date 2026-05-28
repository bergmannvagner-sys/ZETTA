"""subscription audit action

Revision ID: 202605270009
Revises: 202605270008
Create Date: 2026-05-27 00:09:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "202605270009"
down_revision: str | None = "202605270008"
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
                    WHERE enumlabel = 'SUBSCRIPTION_STATUS_UPDATED'
                    AND enumtypid = 'auditaction'::regtype
                ) THEN
                    ALTER TYPE auditaction ADD VALUE 'SUBSCRIPTION_STATUS_UPDATED';
                END IF;
            END
            $$;
            """
        )


def downgrade() -> None:
    pass
