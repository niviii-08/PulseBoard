"""Social intelligence: brand monitoring, risk, propagation, alerts

Revision ID: 07a118ee97f3
Revises: b985b88e3891
Create Date: 2026-09-13 12:00:00.000000

Builds on the initial trend-pivot migration to add:
  - brands, risk_assessments, propagation_events, alerts (new tables)
  - richer mentions (author/url/engagement/keywords/brand_id/sentiment_label)
  - richer trend_snapshots (baseline/positive/negative/neutral/cross-platform/
    trend_score/score_breakdown) -- and drops the old placeholder
    `risk_score` column that trend_snapshots is no longer responsible for
    (risk now lives on RiskAssessment, scoped to a brand, not a topic)
  - richer ai_insights (kind/evidence/generated_by)
  - richer topics (keywords/brand_id)
  - two new platformenum values (youtube, web)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '07a118ee97f3'
down_revision: Union[str, None] = 'b985b88e3891'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- New enum values -------------------------------------------------
    # Must run outside the same transaction a new value is *used* in, but
    # fine as a standalone statement in this migration's transaction.
    op.execute("ALTER TYPE platformenum ADD VALUE IF NOT EXISTS 'youtube'")
    op.execute("ALTER TYPE platformenum ADD VALUE IF NOT EXISTS 'web'")

    # --- brands ------------------------------------------------------------
    op.create_table(
        'brands',
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('aliases', sa.JSON(), nullable=True),
        sa.Column('keywords', sa.JSON(), nullable=True),
        sa.Column('monitoring_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )

    # --- topics: add keywords + brand_id ------------------------------------
    op.add_column('topics', sa.Column('keywords', sa.JSON(), nullable=True))
    op.add_column('topics', sa.Column('brand_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_topics_brand_id', 'topics', 'brands', ['brand_id'], ['id'], ondelete='SET NULL')

    # --- mentions: normalize to the full NormalizedPost shape --------------
    op.add_column('mentions', sa.Column('brand_id', sa.UUID(), nullable=True))
    op.add_column('mentions', sa.Column('external_id', sa.String(length=255), nullable=True))
    op.add_column('mentions', sa.Column('author', sa.String(length=255), nullable=True))
    op.add_column('mentions', sa.Column('url', sa.String(length=2048), nullable=True))
    op.add_column('mentions', sa.Column('sentiment_label', sa.String(length=16), nullable=False, server_default='neutral'))
    op.add_column('mentions', sa.Column('engagement_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('mentions', sa.Column('keywords', sa.JSON(), nullable=True))
    op.add_column('mentions', sa.Column('collected_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('mentions', sa.Column('source_is_demo', sa.Boolean(), nullable=False, server_default='false'))
    op.create_foreign_key('fk_mentions_brand_id', 'mentions', 'brands', ['brand_id'], ['id'], ondelete='SET NULL')

    # --- trend_snapshots: replace the placeholder risk_score with the full
    # momentum-scoring breakdown --------------------------------------------
    op.add_column('trend_snapshots', sa.Column('baseline_volume', sa.Float(), nullable=False, server_default='0'))
    op.add_column('trend_snapshots', sa.Column('positive_pct', sa.Float(), nullable=False, server_default='0'))
    op.add_column('trend_snapshots', sa.Column('negative_pct', sa.Float(), nullable=False, server_default='0'))
    op.add_column('trend_snapshots', sa.Column('neutral_pct', sa.Float(), nullable=False, server_default='0'))
    op.add_column('trend_snapshots', sa.Column('cross_platform_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('trend_snapshots', sa.Column('trend_score', sa.Float(), nullable=False, server_default='0'))
    op.add_column('trend_snapshots', sa.Column('score_breakdown', sa.JSON(), nullable=True))
    op.drop_column('trend_snapshots', 'risk_score')

    # --- ai_insights: kind/evidence/generated_by ----------------------------
    op.add_column('ai_insights', sa.Column('kind', sa.String(length=32), nullable=False, server_default='why_trending'))
    op.add_column('ai_insights', sa.Column('evidence', sa.JSON(), nullable=True))
    op.add_column('ai_insights', sa.Column('generated_by', sa.String(length=32), nullable=False, server_default='deterministic'))

    # --- risk_assessments ----------------------------------------------------
    op.create_table(
        'risk_assessments',
        sa.Column('brand_id', sa.UUID(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('risk_score', sa.Float(), nullable=False, server_default='0'),
        sa.Column(
            'risk_level',
            sa.Enum('LOW', 'MODERATE', 'HIGH', 'CRITICAL', name='risklevel'),
            nullable=False,
            server_default='LOW',
        ),
        sa.Column('drivers', sa.JSON(), nullable=True),
        sa.Column('negative_mentions_pct', sa.Float(), nullable=False, server_default='0'),
        sa.Column('mention_growth_rate', sa.Float(), nullable=False, server_default='0'),
        sa.Column('platforms_affected', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('complaint_clusters', sa.JSON(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['brand_id'], ['brands.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # --- propagation_events ---------------------------------------------------
    op.create_table(
        'propagation_events',
        sa.Column('topic_id', sa.UUID(), nullable=False),
        sa.Column('platform', sa.String(length=32), nullable=False),
        sa.Column('first_seen_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('sequence_order', sa.Integer(), nullable=False),
        sa.Column('mentions_at_detection', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('growth_since_entry_pct', sa.Float(), nullable=False, server_default='0'),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('topic_id', 'platform', name='uq_propagation_topic_platform'),
    )

    # --- alerts -----------------------------------------------------------------
    op.create_table(
        'alerts',
        sa.Column(
            'alert_type',
            sa.Enum(
                'EMERGING_TREND', 'SENTIMENT_SHIFT', 'BRAND_RISK', 'MENTION_SPIKE', 'CROSS_PLATFORM_SPREAD',
                name='alerttype',
            ),
            nullable=False,
        ),
        sa.Column(
            'severity',
            sa.Enum('INFO', 'WARNING', 'CRITICAL', name='alertseverity'),
            nullable=False,
            server_default='INFO',
        ),
        sa.Column('topic_id', sa.UUID(), nullable=True),
        sa.Column('brand_id', sa.UUID(), nullable=True),
        sa.Column('message', sa.String(length=500), nullable=False),
        sa.Column('drivers', sa.JSON(), nullable=True),
        sa.Column('threshold_value', sa.Float(), nullable=True),
        sa.Column('observed_value', sa.Float(), nullable=True),
        sa.Column('acknowledged', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['brand_id'], ['brands.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('alerts')
    op.execute('DROP TYPE IF EXISTS alerttype')
    op.execute('DROP TYPE IF EXISTS alertseverity')

    op.drop_table('propagation_events')

    op.drop_table('risk_assessments')
    op.execute('DROP TYPE IF EXISTS risklevel')

    op.drop_column('ai_insights', 'generated_by')
    op.drop_column('ai_insights', 'evidence')
    op.drop_column('ai_insights', 'kind')

    op.add_column('trend_snapshots', sa.Column('risk_score', sa.Float(), nullable=False, server_default='0'))
    op.drop_column('trend_snapshots', 'score_breakdown')
    op.drop_column('trend_snapshots', 'trend_score')
    op.drop_column('trend_snapshots', 'cross_platform_count')
    op.drop_column('trend_snapshots', 'neutral_pct')
    op.drop_column('trend_snapshots', 'negative_pct')
    op.drop_column('trend_snapshots', 'positive_pct')
    op.drop_column('trend_snapshots', 'baseline_volume')

    op.drop_constraint('fk_mentions_brand_id', 'mentions', type_='foreignkey')
    op.drop_column('mentions', 'source_is_demo')
    op.drop_column('mentions', 'collected_at')
    op.drop_column('mentions', 'keywords')
    op.drop_column('mentions', 'engagement_count')
    op.drop_column('mentions', 'sentiment_label')
    op.drop_column('mentions', 'url')
    op.drop_column('mentions', 'author')
    op.drop_column('mentions', 'external_id')
    op.drop_column('mentions', 'brand_id')

    op.drop_constraint('fk_topics_brand_id', 'topics', type_='foreignkey')
    op.drop_column('topics', 'brand_id')
    op.drop_column('topics', 'keywords')

    op.drop_table('brands')

    # Note: Postgres cannot remove enum values via ALTER TYPE ... DROP VALUE
    # (unsupported). Rolling back platformenum's added values would require
    # recreating the type; deliberately left as-is since no downgrade path
    # in this project actually needs it removed.
