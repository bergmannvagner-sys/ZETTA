"""emotional journal sharing and nr1

Revision ID: 202605270005
Revises: 202605270004
Create Date: 2026-05-27 00:05:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "202605270005"
down_revision: str | None = "202605270004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(table_name: str) -> bool:
    return inspect(op.get_bind()).has_table(table_name)


def _index_exists(table_name: str, index_name: str) -> bool:
    if not _table_exists(table_name):
        return False
    return any(index["name"] == index_name for index in inspect(op.get_bind()).get_indexes(table_name))


def upgrade() -> None:
    if not _table_exists("bergmann_journal_entries"):
        op.create_table(
            "bergmann_journal_entries",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("entry_type", sa.String(length=32), nullable=False),
            sa.Column("tags_json", sa.Text(), nullable=True),
            sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["bergmann_users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _index_exists("bergmann_journal_entries", op.f("ix_bergmann_journal_entries_user_id")):
        op.create_index(op.f("ix_bergmann_journal_entries_user_id"), "bergmann_journal_entries", ["user_id"])

    if not _table_exists("bergmann_emotion_logs"):
        op.create_table(
            "bergmann_emotion_logs",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("mood", sa.String(length=48), nullable=False),
            sa.Column("emotions_json", sa.Text(), nullable=True),
            sa.Column("intensity", sa.Integer(), nullable=False),
            sa.Column("energy", sa.Integer(), nullable=True),
            sa.Column("anxiety", sa.Integer(), nullable=True),
            sa.Column("stress", sa.Integer(), nullable=True),
            sa.Column("sleep_quality", sa.Integer(), nullable=True),
            sa.Column("motivation", sa.Integer(), nullable=True),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["bergmann_users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _index_exists("bergmann_emotion_logs", op.f("ix_bergmann_emotion_logs_user_id")):
        op.create_index(op.f("ix_bergmann_emotion_logs_user_id"), "bergmann_emotion_logs", ["user_id"])

    if not _table_exists("bergmann_user_sharing_consents"):
        op.create_table(
            "bergmann_user_sharing_consents",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("owner_user_id", sa.String(length=36), nullable=False),
            sa.Column("target_user_id", sa.String(length=36), nullable=False),
            sa.Column(
                "target_role",
                sa.Enum(
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
                ),
                nullable=False,
            ),
            sa.Column("categories_json", sa.Text(), nullable=False),
            sa.Column("summary_only", sa.Boolean(), nullable=False),
            sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
            sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
            sa.Column("granted_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["owner_user_id"], ["bergmann_users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["target_user_id"], ["bergmann_users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _index_exists("bergmann_user_sharing_consents", op.f("ix_bergmann_user_sharing_consents_owner_user_id")):
        op.create_index(
            op.f("ix_bergmann_user_sharing_consents_owner_user_id"),
            "bergmann_user_sharing_consents",
            ["owner_user_id"],
        )
    if not _index_exists("bergmann_user_sharing_consents", op.f("ix_bergmann_user_sharing_consents_target_user_id")):
        op.create_index(
            op.f("ix_bergmann_user_sharing_consents_target_user_id"),
            "bergmann_user_sharing_consents",
            ["target_user_id"],
        )

    if not _table_exists("bergmann_emotional_reports"):
        op.create_table(
            "bergmann_emotional_reports",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column(
                "audience",
                sa.Enum("USER", "PSYCHOLOGIST", "COMPANY", name="reportaudience"),
                nullable=False,
            ),
            sa.Column("summary", sa.Text(), nullable=False),
            sa.Column("risk_level", sa.String(length=32), nullable=False),
            sa.Column("metadata_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["bergmann_users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _index_exists("bergmann_emotional_reports", op.f("ix_bergmann_emotional_reports_user_id")):
        op.create_index(op.f("ix_bergmann_emotional_reports_user_id"), "bergmann_emotional_reports", ["user_id"])

    if not _table_exists("bergmann_nr1_reports"):
        op.create_table(
            "bergmann_nr1_reports",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("company_user_id", sa.String(length=36), nullable=False),
            sa.Column("participant_count", sa.Integer(), nullable=False),
            sa.Column("suppressed", sa.Boolean(), nullable=False),
            sa.Column("summary", sa.Text(), nullable=False),
            sa.Column("indicators_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["company_user_id"], ["bergmann_users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _index_exists("bergmann_nr1_reports", op.f("ix_bergmann_nr1_reports_company_user_id")):
        op.create_index(op.f("ix_bergmann_nr1_reports_company_user_id"), "bergmann_nr1_reports", ["company_user_id"])


def downgrade() -> None:
    for table_name, indexes in (
        ("bergmann_nr1_reports", (op.f("ix_bergmann_nr1_reports_company_user_id"),)),
        ("bergmann_emotional_reports", (op.f("ix_bergmann_emotional_reports_user_id"),)),
        (
            "bergmann_user_sharing_consents",
            (
                op.f("ix_bergmann_user_sharing_consents_target_user_id"),
                op.f("ix_bergmann_user_sharing_consents_owner_user_id"),
            ),
        ),
        ("bergmann_emotion_logs", (op.f("ix_bergmann_emotion_logs_user_id"),)),
        ("bergmann_journal_entries", (op.f("ix_bergmann_journal_entries_user_id"),)),
    ):
        for index_name in indexes:
            if _index_exists(table_name, index_name):
                op.drop_index(index_name, table_name=table_name)
        if _table_exists(table_name):
            op.drop_table(table_name)
