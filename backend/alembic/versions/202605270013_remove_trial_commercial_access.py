"""remove trial commercial access

Revision ID: 202605270013
Revises: 202605270012
Create Date: 2026-05-27 00:13:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "202605270013"
down_revision: str | None = "202605270012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE bergmann_users
        SET subscription_status = 'PENDING'
        WHERE subscription_status = 'TRIAL'
          AND role NOT IN ('USER', 'SUPER_ADMIN')
        """
    )


def downgrade() -> None:
    pass
