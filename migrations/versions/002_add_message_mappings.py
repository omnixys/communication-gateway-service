"""add message_mappings table

Revision ID: 002
Revises: 001
Create Date: 2026-07-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "message_mappings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("internal_id", sa.String(36), nullable=False, unique=True, index=True),
        sa.Column("provider_message_id", sa.String(255), nullable=False, index=True),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("conversation_id", sa.String(36), nullable=False, index=True),
        sa.Column("sender", sa.String(255), nullable=False, server_default=""),
        sa.Column("recipient", sa.String(255), nullable=False, server_default=""),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("tenant_id", sa.String(36), nullable=False, server_default=""),
        sa.Column("organization_id", sa.String(36), nullable=False, server_default=""),
        sa.Column("provider_instance", sa.String(100), nullable=False, server_default=""),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_status_change", sa.DateTime(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    op.create_index(
        "ix_message_mappings_provider_provider_msg_id",
        "message_mappings",
        ["provider", "provider_message_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_message_mappings_provider_provider_msg_id", table_name="message_mappings")
    op.drop_table("message_mappings")
