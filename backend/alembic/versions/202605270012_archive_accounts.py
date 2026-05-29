"""archive accounts

Revision ID: 202605270012
Revises: 202605270011
Create Date: 2026-05-27 00:12:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "202605270012"
down_revision: str | None = "202605270011"
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
                    WHERE enumlabel = 'ARCHIVED'
                    AND enumtypid = 'accountstatus'::regtype
                ) THEN
                    ALTER TYPE accountstatus ADD VALUE 'ARCHIVED';
                END IF;
            END
            $$;
            """
        )
        op.execute(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_enum
                    WHERE enumlabel = 'ACCOUNT_ARCHIVED'
                    AND enumtypid = 'auditaction'::regtype
                ) THEN
                    ALTER TYPE auditaction ADD VALUE 'ACCOUNT_ARCHIVED';
                END IF;
            END
            $$;
            """
        )


def downgrade() -> None:
    pass
