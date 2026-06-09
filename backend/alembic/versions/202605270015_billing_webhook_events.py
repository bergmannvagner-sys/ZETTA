"""billing webhook events

Revision ID: 202605270015
Revises: 202605270014
Create Date: 2026-05-27 00:15:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


revision: str = "202605270015"
down_revision: str | None = "202605270014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(table_name: str) -> bool:
    return inspect(op.get_bind()).has_table(table_name)


def _index_exists(table_name: str, index_name: str) -> bool:
    return any(index["name"] == index_name for index in inspect(op.get_bind()).get_indexes(table_name))


def _create_index_once(index_name: str, table_name: str, columns: list[str]) -> None:
    if _table_exists(table_name) and not _index_exists(table_name, index_name):
        op.create_index(index_name, table_name, columns)


def upgrade() -> None:
    if not _table_exists("bergmann_billing_webhook_events"):
        op.create_table(
            "bergmann_billing_webhook_events",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("provider", sa.String(length=32), nullable=False),
            sa.Column("event_id", sa.String(length=160), nullable=False),
            sa.Column("account_reference_id", sa.String(length=36), nullable=True),
            sa.Column("linked_user_id", sa.String(length=36), nullable=True),
            sa.Column("customer_id", sa.String(length=120), nullable=True),
            sa.Column("subscription_id", sa.String(length=120), nullable=True),
            sa.Column("external_status", sa.String(length=80), nullable=True),
            sa.Column("processing_status", sa.String(length=32), nullable=False),
            sa.Column("duplicate", sa.Boolean(), nullable=False),
            sa.Column("error", sa.Text(), nullable=True),
            sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["linked_user_id"], ["bergmann_users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("provider", "event_id", name="uq_bergmann_billing_webhook_events_provider_event"),
        )

    _create_index_once("ix_bergmann_billing_webhook_events_provider", "bergmann_billing_webhook_events", ["provider"])
    _create_index_once("ix_bergmann_billing_webhook_events_event_id", "bergmann_billing_webhook_events", ["event_id"])
    _create_index_once(
        "ix_bergmann_billing_webhook_events_account_reference_id",
        "bergmann_billing_webhook_events",
        ["account_reference_id"],
    )
    _create_index_once(
        "ix_bergmann_billing_webhook_events_linked_user_id",
        "bergmann_billing_webhook_events",
        ["linked_user_id"],
    )
    _create_index_once(
        "ix_bergmann_billing_webhook_events_customer_id",
        "bergmann_billing_webhook_events",
        ["customer_id"],
    )
    _create_index_once(
        "ix_bergmann_billing_webhook_events_subscription_id",
        "bergmann_billing_webhook_events",
        ["subscription_id"],
    )
    _create_index_once(
        "ix_bergmann_billing_webhook_events_processing_status",
        "bergmann_billing_webhook_events",
        ["processing_status"],
    )


def downgrade() -> None:
    if _table_exists("bergmann_billing_webhook_events"):
        op.drop_table("bergmann_billing_webhook_events")
