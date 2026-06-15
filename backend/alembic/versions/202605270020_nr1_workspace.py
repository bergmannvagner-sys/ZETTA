"""nr1 workspace"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "202605270020"
down_revision: str | None = "202605270019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "bergmann_nr1_workspaces",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("company_user_id", sa.String(length=36), sa.ForeignKey("bergmann_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_name", sa.String(length=160), nullable=False),
        sa.Column("unit_name", sa.String(length=160), nullable=True),
        sa.Column("gro_owner_name", sa.String(length=160), nullable=True),
        sa.Column("scope_statement", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("last_reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("company_user_id", name="uq_bergmann_nr1_workspaces_company_user_id"),
    )
    op.create_index("ix_bergmann_nr1_workspaces_status", "bergmann_nr1_workspaces", ["status"], unique=False)

    op.create_table(
        "bergmann_nr1_risk_items",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column(
            "workspace_id",
            sa.String(length=36),
            sa.ForeignKey("bergmann_nr1_workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("severity", sa.Integer(), nullable=False),
        sa.Column("likelihood", sa.Integer(), nullable=False),
        sa.Column("owner_label", sa.String(length=160), nullable=True),
        sa.Column("due_on", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_template", sa.Boolean(), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_bergmann_nr1_risk_items_workspace_id", "bergmann_nr1_risk_items", ["workspace_id"], unique=False)
    op.create_index("ix_bergmann_nr1_risk_items_category", "bergmann_nr1_risk_items", ["category"], unique=False)
    op.create_index("ix_bergmann_nr1_risk_items_source", "bergmann_nr1_risk_items", ["source"], unique=False)
    op.create_index("ix_bergmann_nr1_risk_items_status", "bergmann_nr1_risk_items", ["status"], unique=False)

    op.create_table(
        "bergmann_nr1_action_items",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column(
            "workspace_id",
            sa.String(length=36),
            sa.ForeignKey("bergmann_nr1_workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "risk_item_id",
            sa.String(length=36),
            sa.ForeignKey("bergmann_nr1_risk_items.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner_label", sa.String(length=160), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("progress_percent", sa.Integer(), nullable=False),
        sa.Column("due_on", sa.Date(), nullable=True),
        sa.Column("completed_on", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_template", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_bergmann_nr1_action_items_workspace_id", "bergmann_nr1_action_items", ["workspace_id"], unique=False)
    op.create_index("ix_bergmann_nr1_action_items_risk_item_id", "bergmann_nr1_action_items", ["risk_item_id"], unique=False)
    op.create_index("ix_bergmann_nr1_action_items_status", "bergmann_nr1_action_items", ["status"], unique=False)
    op.create_index("ix_bergmann_nr1_action_items_due_on", "bergmann_nr1_action_items", ["due_on"], unique=False)

    op.create_table(
        "bergmann_nr1_training_items",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column(
            "workspace_id",
            sa.String(length=36),
            sa.ForeignKey("bergmann_nr1_workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("audience", sa.String(length=160), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("frequency_days", sa.Integer(), nullable=True),
        sa.Column("required_hours", sa.Float(), nullable=True),
        sa.Column("due_on", sa.Date(), nullable=True),
        sa.Column("completed_on", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_template", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_bergmann_nr1_training_items_workspace_id", "bergmann_nr1_training_items", ["workspace_id"], unique=False)
    op.create_index("ix_bergmann_nr1_training_items_status", "bergmann_nr1_training_items", ["status"], unique=False)
    op.create_index("ix_bergmann_nr1_training_items_due_on", "bergmann_nr1_training_items", ["due_on"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_bergmann_nr1_training_items_due_on", table_name="bergmann_nr1_training_items")
    op.drop_index("ix_bergmann_nr1_training_items_status", table_name="bergmann_nr1_training_items")
    op.drop_index("ix_bergmann_nr1_training_items_workspace_id", table_name="bergmann_nr1_training_items")
    op.drop_table("bergmann_nr1_training_items")

    op.drop_index("ix_bergmann_nr1_action_items_due_on", table_name="bergmann_nr1_action_items")
    op.drop_index("ix_bergmann_nr1_action_items_status", table_name="bergmann_nr1_action_items")
    op.drop_index("ix_bergmann_nr1_action_items_risk_item_id", table_name="bergmann_nr1_action_items")
    op.drop_index("ix_bergmann_nr1_action_items_workspace_id", table_name="bergmann_nr1_action_items")
    op.drop_table("bergmann_nr1_action_items")

    op.drop_index("ix_bergmann_nr1_risk_items_status", table_name="bergmann_nr1_risk_items")
    op.drop_index("ix_bergmann_nr1_risk_items_source", table_name="bergmann_nr1_risk_items")
    op.drop_index("ix_bergmann_nr1_risk_items_category", table_name="bergmann_nr1_risk_items")
    op.drop_index("ix_bergmann_nr1_risk_items_workspace_id", table_name="bergmann_nr1_risk_items")
    op.drop_table("bergmann_nr1_risk_items")

    op.drop_index("ix_bergmann_nr1_workspaces_status", table_name="bergmann_nr1_workspaces")
    op.drop_table("bergmann_nr1_workspaces")
