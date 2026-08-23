"""feed_scans and feed_jobs for the extension's LinkedIn feed scanner

feed_scans records every post the scanner saw, including the non-jobs, so a
repeat scan can skip a URL without paying to reclassify it. feed_jobs holds
the ones classified as jobs, with their relevance score.

Revision ID: 0003_feed_tables
Revises: 0002_single_model
Create Date: 2026-08-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_feed_tables"
down_revision: Union[str, None] = "0002_single_model"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "feed_scans",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("post_url", sa.String(length=1000), nullable=False),
        sa.Column("post_type", sa.String(length=20), nullable=False),
        sa.Column("raw_content", sa.Text(), nullable=True),
        sa.Column("author_name", sa.String(length=255), nullable=True),
        sa.Column("author_url", sa.String(length=500), nullable=True),
        sa.Column("scanned_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "post_url", name="uq_feed_scans_user_post"),
    )
    op.create_index(op.f("ix_feed_scans_id"), "feed_scans", ["id"])

    op.create_table(
        "feed_jobs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("linkedin_url", sa.String(length=1000), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("company", sa.String(length=255), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("has_easy_apply", sa.Boolean(), nullable=True),
        sa.Column("ai_score", sa.Integer(), nullable=True),
        sa.Column("match_reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("apply_mode", sa.String(length=20), nullable=True),
        sa.Column("application_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["application_id"], ["job_applications.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "linkedin_url", name="uq_feed_jobs_user_url"),
    )
    op.create_index(op.f("ix_feed_jobs_id"), "feed_jobs", ["id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_feed_jobs_id"), table_name="feed_jobs")
    op.drop_table("feed_jobs")
    op.drop_index(op.f("ix_feed_scans_id"), table_name="feed_scans")
    op.drop_table("feed_scans")
