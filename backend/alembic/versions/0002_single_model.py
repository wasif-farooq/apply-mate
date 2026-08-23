"""drop per-user AI provider config; store resume text; keep match data

Three changes that go together with the move to a single server-side model:

  - provider_configs / provider_models / user_settings.selected_* existed only
    to let a user pick a provider, model and API key. That choice is gone.
  - user_resumes.resume_text holds the PDF text extracted once at upload, so
    the model never receives a filesystem path.
  - job_applications.match_json keeps the skill match the pipeline already
    computes and used to discard.

Revision ID: 0002_single_model
Revises: 0001_baseline
Create Date: 2026-08-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_single_model"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user_resumes", sa.Column("resume_text", sa.Text(), nullable=True))
    op.add_column("user_resumes", sa.Column("char_count", sa.Integer(), nullable=True))
    op.add_column(
        "user_resumes",
        sa.Column("extracted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column("job_applications", sa.Column("match_json", sa.JSON(), nullable=True))

    op.drop_column("user_settings", "selected_model")
    op.drop_column("user_settings", "selected_provider")

    op.drop_index("ix_provider_models_id", table_name="provider_models")
    op.drop_table("provider_models")
    op.drop_index("ix_provider_configs_id", table_name="provider_configs")
    op.drop_table("provider_configs")


def downgrade() -> None:
    op.create_table(
        "provider_configs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=True),
        sa.Column("config", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_provider_configs_id", "provider_configs", ["id"])

    op.create_table(
        "provider_models",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("model_name", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_provider_models_id", "provider_models", ["id"])

    op.add_column("user_settings", sa.Column("selected_provider", sa.String(length=50), nullable=True))
    op.add_column("user_settings", sa.Column("selected_model", sa.String(length=100), nullable=True))

    op.drop_column("job_applications", "match_json")

    op.drop_column("user_resumes", "extracted_at")
    op.drop_column("user_resumes", "char_count")
    op.drop_column("user_resumes", "resume_text")
