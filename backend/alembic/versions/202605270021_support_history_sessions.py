"""support history sessions"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202605270021"
down_revision: str | None = "202605270020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "bergmann_chat_sessions",
        sa.Column("channel", sa.String(length=24), nullable=False, server_default=sa.text("'CHAT'")),
    )
    op.create_index("ix_bergmann_chat_sessions_channel", "bergmann_chat_sessions", ["channel"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_bergmann_chat_sessions_channel", table_name="bergmann_chat_sessions")
    op.drop_column("bergmann_chat_sessions", "channel")
