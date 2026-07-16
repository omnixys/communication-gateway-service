"""Enforce provider webhook idempotency.

Revision ID: 003
Revises: 002
"""

from collections.abc import Sequence

from alembic import op

revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_message_mappings_provider_message_id",
        "message_mappings",
        ["provider_message_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_message_mappings_provider_message_id",
        "message_mappings",
        type_="unique",
    )
