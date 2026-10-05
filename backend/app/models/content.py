import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Float, ForeignKey, Integer, Boolean, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.extensions import Country

from app.models.mixins import UUIDPKMixin, TimestampMixin
from app.core.database import Base


class Source(Base, UUIDPKMixin, TimestampMixin):
    """
    A distinct data source (e.g. 'NewsAPI', 'GDELT', etc.)
    """
    __tablename__ = "sources"

    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. 'news', 'rss', 'social'
    url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class ContentItem(Base, UUIDPKMixin, TimestampMixin):
    """
    The normalized content model (News, RSS, GDELT, etc.) representing an article or post.
    """
    __tablename__ = "content_items"

    source_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("sources.id", ondelete="SET NULL"), nullable=True, index=True)
    source: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True) 
    source_type: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(String(2048), nullable=True, unique=True, index=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    
    country_name: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    country_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("countries.id", ondelete="SET NULL"), nullable=True, index=True)
    
    language: Mapped[str | None] = mapped_column(String(10), nullable=True, index=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    
    engagement: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    sentiment: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    sentiment_label: Mapped[str] = mapped_column(String(16), nullable=False, default="neutral")

    # Arrays for simple extraction, or could use M2M mapping tables. We include these to easily dump unstructured extractions.
    entities_json: Mapped[list | None] = mapped_column(JSON, nullable=True)
    topics_json: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Note: 'created_at' comes from TimestampMixin

    source_rel: Mapped["Source"] = relationship("Source")
    country_rel: Mapped["Country"] = relationship("Country")


class SentimentSnapshot(Base, UUIDPKMixin, TimestampMixin):
    """
    Time-series snapshots of sentiment scores for overall or specific topic trends.
    """
    __tablename__ = "sentiment_snapshots"
    
    topic_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    sentiment_avg: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    positive_volume: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    neutral_volume: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    negative_volume: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_volume: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
