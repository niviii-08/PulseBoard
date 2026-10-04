"""
Core social-listening ORM models: Topic, Mention, TrendSnapshot, AIInsight.

Brand/RiskAssessment/PropagationEvent/Alert live in app/models/social.py --
split out because they represent a distinct concern (brand monitoring +
risk/alerting) layered on top of the raw topic/mention data captured here.
"""

import uuid
import enum
from datetime import datetime

from sqlalchemy import String, DateTime, Float, ForeignKey, Integer, Boolean, Enum as SQLEnum, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .mixins import UUIDPKMixin, TimestampMixin
from ..core.database import Base


class PlatformEnum(str, enum.Enum):
    reddit = "reddit"
    x = "x"
    news = "news"
    youtube = "youtube"
    web = "web"
    tiktok = "tiktok"


class Topic(Base, UUIDPKMixin, TimestampMixin):
    """
    A detected subject of conversation (e.g. "iPhone 18 Battery Issue").

    Topics are created either by the topic-assignment step of the
    ingestion pipeline (app/services/topic_service.py), which clusters
    incoming posts by keyword overlap, or implicitly whenever a Brand's
    keywords match a post that doesn't fit an existing topic.
    """
    __tablename__ = "topics"

    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    # Keyword set this topic was clustered on -- used by topic_service to
    # decide whether a new post belongs to this topic (Jaccard overlap)
    # and by the "related topics" feature (overlap between two topics'
    # keyword sets).
    keywords: Mapped[list | None] = mapped_column(JSON, nullable=True)
    brand_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("brands.id", ondelete="SET NULL"), nullable=True
    )

    mentions: Mapped[list["Mention"]] = relationship("Mention", back_populates="topic", cascade="all, delete-orphan")
    snapshots: Mapped[list["TrendSnapshot"]] = relationship("TrendSnapshot", back_populates="topic", cascade="all, delete-orphan")
    insights: Mapped[list["AIInsight"]] = relationship("AIInsight", back_populates="topic", cascade="all, delete-orphan")
    propagation_events: Mapped[list["PropagationEvent"]] = relationship(
        "PropagationEvent", back_populates="topic", cascade="all, delete-orphan"
    )


class Mention(Base, UUIDPKMixin):
    """
    A single normalized social/web post. This is the output shape every
    collector (app/collectors/*) must produce -- see
    app.collectors.base.NormalizedPost, which this table mirrors.
    """
    __tablename__ = "mentions"

    topic_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    brand_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("brands.id", ondelete="SET NULL"), nullable=True)

    platform: Mapped[PlatformEnum] = mapped_column(SQLEnum(PlatformEnum), nullable=False)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    country_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("countries.id", ondelete="SET NULL"), nullable=True)

    sentiment_score: Mapped[float] = mapped_column(Float, nullable=False)  # -1.0 .. 1.0
    sentiment_label: Mapped[str] = mapped_column(String(16), nullable=False, default="neutral")

    # Likes + comments/replies + shares/retweets, whatever the source
    # platform exposes, summed into one comparable number. Used for
    # "high-reach post" detection in the risk engine and for ranking
    # "top conversations".
    engagement_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    keywords: Mapped[list | None] = mapped_column(JSON, nullable=True)

    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    source_is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    topic: Mapped["Topic"] = relationship("Topic", back_populates="mentions")
    country: Mapped["Country"] = relationship("Country", back_populates="mentions")


class TrendSnapshot(Base, UUIDPKMixin, TimestampMixin):
    """
    A point-in-time rollup of a Topic's momentum, produced by
    app.services.trend_engine.score_topic(). One row per engine run per
    topic -- this is what /trends/emerging and the sentiment-over-time
    chart read from, so the engine's math is auditable after the fact
    instead of a request-time black box.
    """
    __tablename__ = "trend_snapshots"

    topic_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    volume_last_hour: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    baseline_volume: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    sentiment_avg: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    positive_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    negative_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    neutral_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    growth_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)      # % vs baseline
    acceleration: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)     # change in growth_rate
    cross_platform_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    trend_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)      # 0-100, see trend_engine
    score_breakdown: Mapped[dict | None] = mapped_column(JSON, nullable=True)           # {component: points}

    topic: Mapped["Topic"] = relationship("Topic", back_populates="snapshots")


class AIInsight(Base, UUIDPKMixin, TimestampMixin):
    """
    A generated "why is this trending" / sentiment-shift explanation for
    a topic, produced by app.services.explanation_engine. `evidence` is
    the structured data the explanation was grounded in, kept alongside
    the text so the claim is auditable rather than taken on faith.
    """
    __tablename__ = "ai_insights"

    topic_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False, default="why_trending")  # why_trending | sentiment_shift
    summary_text: Mapped[str] = mapped_column(String, nullable=False)
    key_drivers: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    evidence: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    generated_by: Mapped[str] = mapped_column(String(32), nullable=False, default="deterministic")  # deterministic | llm

    topic: Mapped["Topic"] = relationship("Topic", back_populates="insights")

# Note: PropagationEvent (in app/models/social.py) also has a
# back_populates relationship to Topic. SQLAlchemy resolves relationship()
# string targets against the shared declarative registry at mapper
# configuration time, not via Python import, so no circular import is
# needed here -- app/models/__init__.py just needs to import both modules
# before the app runs, which it does.
