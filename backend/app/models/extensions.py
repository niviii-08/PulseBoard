from sqlalchemy import Column, String, Float, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
from app.models.mixins import UUIDPKMixin, TimestampMixin
from app.core.database import Base

class Country(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "countries"

    iso_code: Mapped[str] = mapped_column(String(2), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Could track overall sentiment or volume in snapshots, or just calculate on the fly
    mentions: Mapped[list["app.models.trend.Mention"]] = relationship("Mention", back_populates="country")

class Entity(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "entities"

    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False) # PERSON, ORG, LOC

class TopicMention(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "topic_mentions"

    topic_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"))
    mention_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mentions.id", ondelete="CASCADE"))
