"""Add transactional analytics outcome records.

Revision ID: 004
Revises: 003
"""

# ruff: noqa: D103, INP001, TC003

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "004"
down_revision: str | None = "003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "delivery_logs",
        sa.Column("tenant_id", sa.String(36), nullable=False, server_default=""),
    )
    op.create_table(
        "analytics_outbox",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("deduplication_key", sa.String(500), nullable=False),
        sa.Column("tenant_id", sa.String(36), nullable=False),
        sa.Column("topic", sa.String(200), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("correlation_id", sa.String(255)),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("locked_at", sa.DateTime(timezone=True)),
        sa.Column("locked_by", sa.String(36)),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("dead_lettered_at", sa.DateTime(timezone=True)),
        sa.Column("last_error", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("deduplication_key", name="uq_analytics_outbox_deduplication_key"),
    )
    op.create_index("ix_analytics_outbox_tenant_id", "analytics_outbox", ["tenant_id"])
    op.create_index(
        "ix_analytics_outbox_ready",
        "analytics_outbox",
        ["published_at", "dead_lettered_at", "next_attempt_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_analytics_outbox_ready", table_name="analytics_outbox")
    op.drop_index("ix_analytics_outbox_tenant_id", table_name="analytics_outbox")
    op.drop_table("analytics_outbox")
    op.drop_column("delivery_logs", "tenant_id")
